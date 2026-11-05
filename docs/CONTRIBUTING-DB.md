# Migrations (Drizzle)

Use só o banco local. Não coloque a URL de produção no `.env`. Não existe URL de produção fora do ambiente de deploy.

A migration de produção roda **dentro do ambiente de deploy**, com `scripts/migrate.ts` (`npm run db:migrate:deploy`), **antes** de trocar a versão da API. O GitHub Actions não aplica mais nada em produção.

Regra central: **toda migration precisa funcionar com o código que está rodando em produção agora.** O código novo só entra depois que o banco já migrou.

## Fluxo diário

1. `git pull --rebase`
2. `npm run db:migrate`
3. Altere o schema em `src/db/`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:check`
7. `npm run db:lint`
8. Faça o commit do schema e da pasta `drizzle/` juntos

`db:generate`, `db:migrate` e `db:check` só rodam no banco local.

## O que o deploy faz

`scripts/migrate.ts` lê `MIGRATION_DATABASE_URL` (conexão direta, `max: 1`). Não passe por pgbouncer em transaction mode nem por RDS Proxy: o advisory lock é da sessão.

Antes de aplicar, ele confere se alguma migration do journal ficaria para trás (o Drizzle compara só o `created_at` da última aplicada e ignora o resto em silêncio) e roda o mesmo lint do CI. Achado bloqueante sem `-- lint-approved` aborta. Não há variável de ambiente para pular isso.

Se a migration falhar, a versão antiga da API continua no ar. Não troque a versão.

O caminho certo é um passo separado: `npm run db:migrate:deploy` (ou `tsx scripts/migrate.ts`) e só depois o rollout da API. A imagem Docker já contém o script, a pasta `drizzle/` e o que ele precisa para rodar. O `docker/entrypoint.sh` ainda aplica a migration e, se ela passar, sobe a API no mesmo container. Isso só preserva a versão antiga se o orquestrador não a derrubar antes do container novo ficar saudável. Prefira o passo separado.

Tire um snapshot do banco (backup do provedor ou PITR) antes de cada deploy que tenha migration.

O hook `pre-push` (`lefthook`) roda `db:lint` e `typecheck` como feedback rápido. Ele pode ser pulado (`LEFTHOOK=0` ou `--no-verify`) e **não substitui o CI**. Se não houver `origin/main` local, o `db:lint` do hook não faz nada.

## Permitido

- `CREATE TABLE`
- `ADD COLUMN` anulável, ou com `DEFAULT` constante
- índice em tabela pequena
- constraint `NOT VALID`, validada depois

## Perigoso

Vira dois deploys, ou uma janela curta combinada:

- `DROP` de coluna, tabela, tipo ou constraint
- `RENAME`
- `ALTER COLUMN ... TYPE`
- `SET NOT NULL`
- `ADD COLUMN ... NOT NULL` sem default

O lint bloqueia o que consegue ver. O que ele não vê continua na revisão humana. Os testes da API não usam PostgreSQL, então o CI não prova que a migration convive com o código que está em produção.

## SET NOT NULL

1. `ALTER TABLE ... ADD CONSTRAINT ... CHECK (coluna IS NOT NULL) NOT VALID`
2. `VALIDATE CONSTRAINT` numa migration seguinte, fora do pico
3. `SET NOT NULL` só depois da validação

## Índice em tabela grande

`CREATE INDEX CONCURRENTLY` não roda dentro da transação do Drizzle. Para tabela grande:

1. Crie o índice com `CONCURRENTLY` manualmente no ambiente, antes do deploy
2. Deixe na migration `CREATE INDEX IF NOT EXISTS` (vira no-op)

O mesmo vale para `DROP INDEX` grande: remova com `CONCURRENTLY` antes e deixe `DROP INDEX IF EXISTS`.

## Como aprovar uma exceção

No próprio `.sql`, uma linha por regra:

```sql
-- lint-approved: DL-01 rename feito à mão porque o Drizzle gerou drop
```

O motivo precisa ter pelo menos 15 caracteres. Vale só para aquela regra e só naquele arquivo. Não existe aprovação genérica. `RULE-ID` desconhecido ou motivo curto falha o lint. Aprovação sem achado correspondente vira aviso.

Não use `squawk-ignore` nem `-- destructive-approved`.

Para mudar a severidade de uma regra no futuro, edite `scripts/lint-migrations.config.json` (`"B"` ou `"W"`).

## Conflito de migration

Se a migration que você gerou conflitar com a `main`:

1. Descarte a sua migration (o `.sql` e o que você gerou em `drizzle/meta/`)
2. Atualize a branch com a `main`
3. `npm run db:migrate`
4. Rode `npm run db:generate` de novo

Uma migration com `when` menor que o da `main` pode ser ignorada em silêncio pelo migrator. O lint (`INT-02`) bloqueia isso.

## Proibições

- Não use `drizzle-kit push`
- Não edite migration que já entrou na `main` (SQL, snapshot ou entrada antiga do journal)

## Catálogo

Severidade B bloqueia. W avisa. Tabela criada no mesmo arquivo não entra em `LK-*` nem nestas regras do squawk: `require-concurrent-index-creation`, `adding-foreign-key-constraint`, `constraint-missing-not-valid`, `disallowed-unique-constraint`, `adding-field-with-default`. Perda de dados e segurança não têm essa isenção.

| ID | Sev. | Motivo | Alternativa |
| --- | --- | --- | --- |
| INT-01 | B | Arquivo já presente na base foi modificado, renomeado ou removido. O journal só pode crescer no fim. | Descarte a alteração e gere uma migration nova. |
| INT-02 | B | `when` novo menor ou igual ao maior da base, ou fora de ordem. O Drizzle ignora isso em silêncio. | Descarte a migration local, atualize com a main, `db:migrate`, `db:generate`. |
| INT-03 | B | Journal, SQL ou snapshot inconsistente, órfão ou com `<<<<<<<`. | Regenere com `db:generate`. |
| INT-04 | W | Mais de uma migration nova. Elas rodam na mesma transação. | Uma migration por PR. |
| DL-01 | B | Drop+add de coluna, ou drop+create de tabela com colunas parecidas. Apaga dado. | `RENAME COLUMN` ou `RENAME TABLE`. |
| DL-02 | B | `DELETE`/`UPDATE` sem `WHERE`. Com `WHERE`, vira aviso. | Filtre e confira o volume. |
| DL-03 | B | `TRUNCATE`. | Não use em produção. |
| DL-04 | B | `DROP SCHEMA`, `DROP TYPE`, `DROP CONSTRAINT`, `DROP DATABASE`. | Remova num segundo deploy, quando o código novo já não depender do objeto. |
| DL-05 | B | `ALTER COLUMN ... TYPE`, pior com `USING`. Reescreve a tabela. | Coluna nova, backfill, remoção depois. |
| LK-01 | B | `SET NOT NULL` em tabela existente. | `CHECK NOT VALID`, `VALIDATE`, depois `SET NOT NULL`. |
| LK-02 | B | `ADD COLUMN ... GENERATED ... STORED`. | Calcule na aplicação. |
| LK-03 | B | `PRIMARY KEY` ou `UNIQUE` sem `USING INDEX`. | Crie o índice antes e anexe com `USING INDEX`. |
| LK-04 | B | `SET LOGGED`/`UNLOGGED`, `SET TABLESPACE`, `CLUSTER`, `VACUUM FULL`, `REINDEX` sem `CONCURRENTLY`, `LOCK TABLE`. | Não coloque isso na migration da API. |
| LK-05 | W | Operação pesada em mais de uma tabela existente. | Uma tabela por migration. |
| EN-01 | B | `ADD VALUE` e uso do valor no mesmo arquivo. Isolado, vira aviso. | Use o valor só na migration seguinte. |
| EN-02 | B | `RENAME VALUE`, `RENAME TO` ou recriar o enum. | Adicione o valor novo e migre o código antes de retirar o antigo. |
| SC-01 | B | `GRANT`, `REVOKE`, `ROLE`/`USER`, `ALTER DEFAULT PRIVILEGES`. | Faça no provisionamento do banco. |
| SC-02 | B | Extension, `ALTER SYSTEM`, `session_replication_role`, trigger on/off, RLS, policy. | Fora da migration do Drizzle. |
| SC-03 | B | Trigger, function, procedure ou rule. | Mantenha a regra na API. |
| SC-04 | B | `DO`, `EXECUTE`, `COPY`, comando `\` do psql, ou SQL que o parser não entende. | SQL estático. |
| SC-05 | B | `BEGIN`/`COMMIT`/`ROLLBACK`/`START TRANSACTION`, ou `SET` de timeout, `role`, `search_path`. | Quem controla isso é o `migrate.ts`. |
| SC-06 | B | Arquivo sem statements, ou snapshot igual ao anterior. | Gere com `db:generate`, ou aprove o SQL manual e explique. |
| adding-required-field | B | `ADD COLUMN NOT NULL` sem default. | Coluna anulável ou com default constante; `NOT NULL` depois. |
| adding-field-with-default | B | Default volátil ou coluna gerada armazenada. No Postgres 16, default constante não dispara. | Default constante, ou coluna anulável. |
| adding-serial-primary-key-field | B | `serial` como chave primária. | Identidade, ou índice criado antes. |
| changing-column-type | B | Mudança de tipo. | Coluna nova e backfill. |
| renaming-column | B | `RENAME COLUMN` quebra o código que está no ar. | Coluna nova; remova a antiga depois. |
| renaming-table | B | `RENAME TABLE` quebra o código que está no ar. | Tabela nova; remova a antiga depois. |
| ban-drop-column | B | `DROP COLUMN` apaga dado que o código antigo ainda lê. | Pare de usar a coluna num deploy e remova no seguinte. |
| ban-drop-table | B | `DROP TABLE`. | Remova o uso antes de dropar. |
| ban-drop-not-null | B | `DROP NOT NULL` muda o contrato da coluna. | Atualize o código antes. |
| ban-drop-database | B | `DROP DATABASE`. | Não coloque isso numa migration. |
| ban-truncate-cascade | B | `TRUNCATE ... CASCADE`. | Não use em produção. |
| ban-concurrent-index-creation-in-transaction | B | `CONCURRENTLY` dentro da transação do Drizzle. | Índice manual antes do deploy e `IF NOT EXISTS` na migration. |
| adding-foreign-key-constraint | B | FK validada na hora, bloqueando escrita. | `NOT VALID` e `VALIDATE CONSTRAINT` depois. |
| constraint-missing-not-valid | B | Constraint nova sem `NOT VALID`. | Crie `NOT VALID` e valide depois. |
| disallowed-unique-constraint | B | Unique/PK construído junto com a constraint. | Índice antes, `USING INDEX` depois. |
| require-concurrent-index-creation | W | `CREATE INDEX` sem `CONCURRENTLY`. | Em tabela grande, o caminho do índice manual acima. |
| require-concurrent-index-deletion | W | `DROP INDEX` sem `CONCURRENTLY`. | Remova o índice manualmente antes do deploy. |
| ban-char-field | W | `char` preenche com espaço. | `text` ou `varchar`. |
| prefer-timestamp-tz | W | `timestamp` sem fuso. | `timestamptz`. |
| prefer-bigint-over-int | W | `integer` estoura cedo. | `bigint` em contadores. |
| prefer-identity | W | `serial` é o mecanismo antigo. | `GENERATED BY DEFAULT AS IDENTITY`. |

Regra do squawk que não está nesta tabela aparece como aviso, com o nome, para ser classificada. `prefer-robust-stmts` fica de fora: o Drizzle não gera `IF NOT EXISTS`.

Na Squawk 2.70 o reporter não emite `adding-not-nullable-field` (o nome real é `adding-required-field`) nem `prefer-timestamptz` (o nome real é `prefer-timestamp-tz`).
