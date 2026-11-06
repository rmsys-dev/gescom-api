# Banco local e produção

O Postgres de produção não é alcançado da sua máquina nem do GitHub Actions. Você gera, aplica e confere migration num banco seu. A produção só muda no ambiente de deploy, pelo `scripts/migrate.ts`, antes de trocar a versão da API.

A regra que organiza o resto: **a migration precisa funcionar com o código que está no ar agora.** O código novo sobe depois que o banco já migrou. Se a coluna nova é `NOT NULL` sem default, a API antiga quebra no primeiro insert. Se você dropa uma coluna que a API antiga ainda lê, a API antiga quebra na hora.

Os testes da API não abrem PostgreSQL. O CI não prova essa convivência. Quem prova é você, lendo o `.sql`, e o code owner no review.

## Duas URLs, dois usos

No `.env` local, copiado de `.env.example`:

- `DATABASE_URL` é a conexão da API (obrigatória no runtime). Em desenvolvimento pode ser o pooler (porta `6543`, com `?pgbouncer=true`) ou o Postgres direto.
- `DRIZZLE_DATABASE_URL` é a conexão do `drizzle-kit`. A API **não** exige essa variável. `db:generate`, `db:migrate` e `db:check` carregam o mesmo `drizzle.config.ts`, então a URL precisa existir para esses comandos. Quem aplica SQL no banco é o `db:migrate`. Porta **5432**, conexão direta ou session mode. O pooler em transaction mode não serve.

`db:generate`, `db:migrate` e `db:check` leem `DRIZZLE_DATABASE_URL` e, se ela faltar, `DATABASE_URL` (`drizzle.config.ts`). Por isso as duas, no seu `.env` de dev, apontam para o banco local.

Não coloque host, usuário ou senha de produção nesse arquivo. Não existe URL de produção fora do ambiente de deploy.

No container, quem migra é outro script e outra variável: `MIGRATION_DATABASE_URL`. Isso está em [Docker](docker.md).

## O que você pode fazer no banco local

O banco local é seu. Pode dropar, recriar, apontar o `.env` para outro database na sua máquina e rodar `db:migrate` de novo. O que não pode é tratar esse banco como se o SQL perigoso fosse aceitável em produção: o mesmo arquivo que você aplica localmente é o que vai para a `main` e, depois, para o deploy.

Liberdade prática:

- Recriar o database e rodar `npm run db:migrate` do zero quando o schema local embolar.
- Inserir o dado que você precisa para testar a tela ou a rota.
- Rodar SQL à mão para inspecionar. Isso não gera migration. Se a inspeção virou mudança de schema, ela tem que nascer no Drizzle e passar pelo `db:generate`.

Não use `drizzle-kit push`. Ele altera o banco sem deixar migration, e o CI vai acusar divergência.

## Manter o banco local atualizado

Toda vez que você pega commit novo da `main`:

```bash
git pull --rebase
npm run db:migrate
```

Isso aplica só o que ainda não está em `drizzle.__drizzle_migrations`. Sem esse passo, a API e os testes manuais rodam contra tabelas velhas.

Quando for a sua vez de mudar o schema:

1. `npm run db:migrate`, para não gerar em cima de um banco atrasado.
2. Altere as entidades em `src/db/`. A entrada é `src/db/schema.ts`.
3. `npm run db:generate`. O Drizzle escreve `drizzle/<tag>.sql`, o snapshot em `drizzle/meta/` e uma entrada no fim de `drizzle/meta/_journal.json`.
4. Leia o `.sql`. Rename tem que aparecer como `RENAME COLUMN` ou `RENAME TABLE`. Se aparecer `DROP` seguido de `ADD` ou `CREATE`, o Drizzle não entendeu o rename. Corrija o schema e gere de novo, ou escreva o `RENAME` com cuidado e aprove a exceção no lint, com motivo.
5. `npm run db:migrate` no banco local.
6. `npm run db:check`.
7. `npm run db:lint`.
8. Commite o schema e a pasta `drizzle/` no mesmo commit.

`db:lint` olha a diferença contra `origin/main`. Migration que já está na `main` é imutável: não edite o `.sql`, o snapshot nem uma entrada antiga do journal. Errou depois do merge? A correção é uma migration nova.

## Conflito de migration

O Drizzle numera a migration pelo `when` do journal. Na hora de aplicar, ele olha só o `created_at` da última linha em `drizzle.__drizzle_migrations` e ignora qualquer arquivo com `when` menor ou igual, mesmo que esse arquivo nunca tenha rodado. Uma migration gerada na sua máquina enquanto a `main` ganhou outra pode sumir em silêncio na produção.

Se a sua migration conflitar, ou se o `db:lint` apontar `INT-02`:

1. Apague a sua migration (o `.sql` e o que você acrescentou em `drizzle/meta/`).
2. Atualize a branch com a `main` (`git rebase origin/main`).
3. `npm run db:migrate`.
4. `npm run db:generate` de novo.

Uma migration por pull request. Duas ou mais rodam na mesma transação. O lint avisa (`INT-04`), não bloqueia, mas o review vai perguntar por quê.

## O que pode ir junto com o código que está no ar

Pode, numa migration só:

- `CREATE TABLE`
- `ADD COLUMN` anulável, ou com `DEFAULT` constante
- índice em tabela pequena
- constraint criada como `NOT VALID`, validada numa migration seguinte

Evite, ou fatie em dois deploys (primeiro o código para de depender do objeto, depois a migration remove; ou o contrário, quando o objeto novo precisa existir antes):

- `DROP` de coluna, tabela, tipo ou constraint
- `RENAME` de coluna, tabela ou valor de enum
- `ALTER COLUMN ... TYPE`
- `SET NOT NULL`
- `ADD COLUMN ... NOT NULL` sem default

`SET NOT NULL` em tabela que já tem linha trava escrita enquanto o Postgres confere a tabela. O caminho seguro:

1. `ALTER TABLE ... ADD CONSTRAINT ... CHECK (coluna IS NOT NULL) NOT VALID`
2. Numa migration seguinte, fora do pico, `VALIDATE CONSTRAINT`
3. Só então `SET NOT NULL`

Índice em tabela grande não usa `CREATE INDEX CONCURRENTLY` dentro da migration. O Drizzle envolve todas as pendentes numa transação, e `CONCURRENTLY` não roda dentro de transação. O caminho:

1. Alguém cria o índice com `CONCURRENTLY` no ambiente, antes do deploy.
2. A migration leva `CREATE INDEX IF NOT EXISTS`, que vira no-op.

O mesmo para `DROP INDEX` grande: `DROP INDEX CONCURRENTLY` manual antes, `DROP INDEX IF EXISTS` na migration.

Enum novo não pode ser criado e usado no mesmo arquivo. `ALTER TYPE ... ADD VALUE` só fica visível na transação seguinte. Adicione o valor numa migration e grave esse valor na próxima.

## Como a produção migra

O GitHub Actions não aplica migration em produção. Não há secret de banco de produção no workflow.

No deploy:

1. Snapshot do banco pelo provedor (backup ou PITR) antes de qualquer deploy que tenha migration.
2. `tsx scripts/migrate.ts`, com `MIGRATION_DATABASE_URL` apontando para a conexão direta.
3. Só depois disso, trocar a versão da API.

O script exige `MIGRATION_DATABASE_URL`. Conexão com `max: 1`. Não passe por pgbouncer em transaction mode nem por RDS Proxy: ele toma `pg_advisory_lock`, que é lock de sessão, e esses pools soltam a conexão no meio.

Antes de aplicar, ele lê **todas** as linhas de `drizzle.__drizzle_migrations`, não só a última. Se alguma entrada do journal ficaria para trás (o caso do `when` antigo), aborta. Em seguida roda o mesmo lint do CI, só nos `.sql` pendentes. Achado bloqueante sem `-- lint-approved` aborta. Não há variável de ambiente para pular o lint.

`statement_timeout` padrão é `120s` (`MIGRATION_STATEMENT_TIMEOUT`, no formato `120s`, `5min`). `lock_timeout` é `5s`.

Se a migration falhar, não troque a versão da API. A imagem Docker ainda chama esse script no entrypoint e sobe a API no mesmo processo quando ele passa. Esse atalho só é seguro se o orquestrador mantiver a versão antiga até o container novo ficar saudável. O passo separado, acima, é o que vale. Detalhe operacional em [Docker](docker.md).

`--dry-run` lista as pendentes e o resultado do lint, sem aplicar:

```bash
tsx scripts/migrate.ts --dry-run
```

## O que o lint exige

`npm run db:lint` (e o job `db-check`, no pull request) roda `scripts/lint-migrations.ts`. No modo do PR ele recebe `--base origin/main`: confere a cadeia contra a base e aplica as regras de conteúdo nos `.sql` novos. No deploy, o `migrate.ts` chama a mesma função só com a lista de arquivos pendentes.

O SQL é lido por um parser de Postgres (`libpg-query`). Comentário e string não disparam regra. Um `DROP TABLE` dentro de comentário ou de literal não é drop. Statement que o parser não entende é erro (`SC-04`).

Tabela criada no mesmo arquivo nasce vazia e fica de fora das regras de lock (`LK-01` a `LK-04`) e de algumas do squawk (`require-concurrent-index-creation`, `adding-foreign-key-constraint`, `constraint-missing-not-valid`, `disallowed-unique-constraint`, `adding-field-with-default`). Perda de dados e segurança não têm essa folga.

Severidade **B** falha o comando e o check. **W** avisa e deixa passar. Para mudar a severidade de uma regra no futuro, edite `scripts/lint-migrations.config.json`. Um achado que já nasce como aviso (por exemplo `DELETE` com `WHERE`) continua aviso mesmo que o arquivo promova a regra para B.

### Aprovar uma exceção

No próprio `.sql`, uma linha por regra:

```sql
-- lint-approved: ban-drop-column a API em producao ja nao le esta coluna
```

O motivo precisa ter pelo menos 15 caracteres. Vale só para aquela regra e só naquele arquivo. Não existe aprovação genérica. Identificador desconhecido ou motivo curto falha o lint. Aprovação sem achado correspondente vira aviso.

Não use `squawk-ignore` nem o antigo `-- destructive-approved`. Cada aprovação aparece no PR e o code owner revisa o motivo. Motivo genérico ("precisa", "ok", "gerado pelo drizzle") não é motivo.

### Catálogo

| ID | Sev. | Por que bloqueia ou avisa | O que fazer no lugar |
| --- | --- | --- | --- |
| INT-01 | B | Arquivo que já existe na base foi editado, renomeado ou removido. O journal só pode crescer no fim. | Descarte a alteração e gere uma migration nova. |
| INT-02 | B | `when` novo menor ou igual ao da base, ou fora de ordem entre as novas. O Drizzle ignora isso em silêncio. | Descarte a migration, atualize com a main, `db:migrate`, `db:generate`. |
| INT-03 | B | Journal sem o `.sql` ou o snapshot, índice furado, tag repetida, arquivo órfão, JSON inválido ou `<<<<<<<`. | Regenere com `db:generate`. |
| INT-04 | W | Mais de uma migration nova no PR. Elas rodam na mesma transação. | Uma migration por PR. |
| DL-01 | B | `DROP COLUMN` e `ADD COLUMN` na mesma tabela, ou `DROP TABLE` e `CREATE TABLE` com pelo menos metade das colunas em comum. É o Drizzle tratando rename como drop. | `RENAME COLUMN` ou `RENAME TABLE`. |
| DL-02 | B | `DELETE` ou `UPDATE` sem `WHERE`. Com `WHERE`, vira aviso: confira o volume do backfill. | Filtre e conte as linhas antes. |
| DL-03 | B | `TRUNCATE`. | Não use em produção. |
| DL-04 | B | `DROP SCHEMA`, `DROP TYPE`, `DROP CONSTRAINT`, `DROP DATABASE`. | Remova num segundo deploy, quando o código novo já não depender do objeto. |
| DL-05 | B | `ALTER COLUMN ... TYPE`, pior com `USING`. Reescreve a tabela. | Coluna nova, backfill, remoção da antiga depois. |
| LK-01 | B | `SET NOT NULL` em tabela que já existe. | `CHECK NOT VALID`, `VALIDATE`, depois `SET NOT NULL`. |
| LK-02 | B | `ADD COLUMN ... GENERATED ... STORED`. Reescreve a tabela. | Calcule na aplicação, ou aceite a janela. |
| LK-03 | B | `ADD PRIMARY KEY` ou `ADD UNIQUE` sem `USING INDEX`. | Crie o índice antes e anexe com `USING INDEX`. |
| LK-04 | B | `SET LOGGED`/`UNLOGGED`, `SET TABLESPACE`, `CLUSTER`, `VACUUM FULL`, `REINDEX` sem `CONCURRENTLY`, `LOCK TABLE`. | Isso não entra na migration da API. |
| LK-05 | W | Operação pesada em mais de uma tabela que já existe. | Uma tabela por migration. |
| EN-01 | B | `ADD VALUE` e uso do valor no mesmo arquivo. Sozinho, vira aviso. | Use o valor só na migration seguinte. |
| EN-02 | B | `RENAME VALUE`, `RENAME TO`, ou dropar o enum e criar outro. | Adicione o valor novo e migre o código antes de aposentar o antigo. |
| SC-01 | B | `GRANT`, `REVOKE`, role, user, `ALTER DEFAULT PRIVILEGES`. | Faça no provisionamento do banco, fora do Drizzle. |
| SC-02 | B | Extension, `ALTER SYSTEM`, `session_replication_role`, ligar ou desligar trigger, RLS, policy. | Fora da migration do Drizzle. |
| SC-03 | B | Trigger, function, procedure ou rule. | A regra fica na API. |
| SC-04 | B | Bloco `DO`, `EXECUTE`, `COPY`, comando `\` do psql, ou SQL que o parser não entende. | SQL estático, que o parser leia. |
| SC-05 | B | `BEGIN`/`COMMIT`/`ROLLBACK`, ou `SET` de timeout, `role` e `search_path`. | Quem controla timeout e transação é o `migrate.ts`. |
| SC-06 | B | Arquivo sem statements, ou snapshot igual ao anterior (SQL escrito à mão, `--custom`). | Gere com `db:generate`, ou aprove e explique o SQL manual. |
| adding-required-field | B | `ADD COLUMN NOT NULL` sem default. | Coluna anulável, ou com default constante. `NOT NULL` depois. |
| adding-field-with-default | B | Default volátil ou coluna gerada armazenada. No Postgres 16, default constante não dispara. | Default constante, ou coluna anulável. |
| adding-serial-primary-key-field | B | `serial` como chave primária. | Identidade, ou índice criado antes. |
| changing-column-type | B | Mudança de tipo. | Coluna nova e backfill. |
| renaming-column | B | O código que está no ar ainda usa o nome antigo. | Coluna nova; remova a antiga no deploy seguinte. |
| renaming-table | B | O código que está no ar ainda usa o nome antigo. | Tabela nova; remova a antiga no deploy seguinte. |
| ban-drop-column | B | Apaga dado que o código antigo ainda lê. | Pare de usar a coluna num deploy e remova no seguinte. |
| ban-drop-table | B | Apaga a tabela. | Remova o uso antes de dropar. |
| ban-drop-not-null | B | Muda o contrato da coluna. | Atualize o código que depende do `NOT NULL` antes. |
| ban-drop-database | B | `DROP DATABASE` não é migration de aplicação. | Não coloque isso no `drizzle/`. |
| ban-truncate-cascade | B | `TRUNCATE ... CASCADE`. | Não use em produção. |
| ban-concurrent-index-creation-in-transaction | B | `CONCURRENTLY` dentro da transação do Drizzle falha. | Índice manual antes do deploy e `IF NOT EXISTS` na migration. |
| adding-foreign-key-constraint | B | A FK válida na hora bloqueia escrita. | `NOT VALID` e `VALIDATE CONSTRAINT` depois. |
| constraint-missing-not-valid | B | Constraint nova sem `NOT VALID`. | Crie `NOT VALID` e valide numa migration seguinte. |
| disallowed-unique-constraint | B | Unique ou PK construído junto com a constraint. | Índice antes, `USING INDEX` depois. |
| require-concurrent-index-creation | W | `CREATE INDEX` sem `CONCURRENTLY`. Em tabela grande trava escrita. | Caminho do índice manual, acima. Em tabela pequena, o aviso pode ficar. |
| require-concurrent-index-deletion | W | `DROP INDEX` sem `CONCURRENTLY`. | Remova o índice manualmente antes, se a tabela for grande. |
| ban-char-field | W | `char` preenche com espaço. | `text` ou `varchar`. |
| prefer-timestamp-tz | W | `timestamp` sem fuso muda de significado entre sessões. | `timestamptz`. |
| prefer-bigint-over-int | W | `integer` estoura por volta de 2 bilhões. | `bigint` em contador e chave que cresce. |
| prefer-identity | W | `serial` é o mecanismo antigo. | `GENERATED BY DEFAULT AS IDENTITY`. |

Regra do squawk que não está nesta tabela aparece como aviso, com o nome, para alguém classificar. `prefer-robust-stmts` fica de fora de propósito: o Drizzle não gera `IF NOT EXISTS`, e a regra só faria barulho.

Dois nomes que a Squawk 2.70 não emite: `adding-not-nullable-field` (o id real é `adding-required-field`) e `prefer-timestamptz` (o id real é `prefer-timestamp-tz`). Aprovar o nome antigo falha.

`require-lock-timeout` e `require-statement-timeout` também aparecem como aviso sem classificação. Não coloque `SET lock_timeout` nem `SET statement_timeout` no `.sql` para calar o aviso: isso é `SC-05`. O `migrate.ts` já define os dois.

## O que o CI faz com o banco

No pull request e no push da `main`, o job `db-check` sobe um Postgres 16 vazio, roda `db:check`, aplica a cadeia com `db:migrate` e gera de novo com `db:generate`. Se a pasta `drizzle/` mudar, o schema e as migrations divergiram.

Só no pull request, o mesmo job roda o lint contra a branch base.

O job `db-data-test` também só trabalha no pull request, e só se houver `.sql` novo. Ele aplica as migrations da `main` num banco vazio, insere uma linha nas tabelas centrais e aplica a pasta `drizzle/` do PR em cima desses dados. As tabelas com seed são: `countries`, `states`, `cities`, `ceps`, `enterprise_groups`, `enterprises`, `users`, `enterprises_members`, `products`, `sales`, `financial_titles`. O log lista as que ficaram sem linha. Esse job pega migration que quebra em cima de dado. Não roda a suíte de testes da API contra esse banco.

Os dois jobs estão no ruleset da `main`. Um PR sem migration ainda passa por eles: `db-data-test` termina verde e pula o seed.
