# CI e a branch main

O GitHub Actions valida o pull request e o push da `main`. Ele não faz deploy e não migra produção. Publicar a API é build da imagem e subida do container, descrito em [Docker](docker.md).

A branch `main` está sob o ruleset `main-quality`. O dia a dia cabe neste texto. A exportação bruta do ruleset, se existir na sua máquina em `docs/main-quality.json`, é só referência local: a pasta `docs/` ignora o que não estiver na lista do `.gitignore`.

## O que a main aceita

Push direto na `main` é recusado. Também são recusados apagar a branch, recriá-la e force push. O histórico da `main` é linear. O único jeito de entrar é pull request, e o único método de merge é **squash**.

Para o squash ser aceito:

- Pelo menos uma aprovação, do code owner. O `CODEOWNERS` entrega o repositório inteiro a `@rmsys-dev`, então a revisão dessa conta é obrigatória em qualquer arquivo.
- A aprovação é do último push. Um commit novo dispensa o review anterior. Não peça aprovação e continue empurrando em cima.
- Toda thread de review resolvida.
- A branch em dia com a `main`. Se alguém mergeou na frente, faça rebase, espere os checks de novo e peça a aprovação outra vez.
- Os sete checks abaixo verdes. O ruleset usa o nome do job, não o nome do workflow.

Uma conta administrativa pode contornar o ruleset. Isso não é o fluxo de desenvolvimento. Não conte com bypass para destravar o seu PR.

## Checks obrigatórios

| Check | Workflow | O que roda |
| --- | --- | --- |
| `typecheck` | CI | `npm run typecheck` |
| `lint` | CI | `npm run lint` (ESLint, zero warnings) |
| `test` | CI | `npm test` |
| `build` | CI | `npm run build` |
| `audit` | CI | `npm audit --audit-level=high --omit=dev`. Vulnerabilidade alta ou crítica em dependência de produção falha o job |
| `db-check` | DB | Journal, migration em Postgres 16 vazio, lint no PR, divergência schema/SQL |
| `db-data-test` | DB | No PR com `.sql` novo: migrations da main, seed, migrations do PR |

Os dois workflows disparam em pull request contra `main` e em push na `main`. Não há filtro de pasta: uma mudança de README também passa pelo banco. Assim um check obrigatório não fica "pulado" e trava o merge.

Os jobs do CI cancelam a execução anterior do mesmo ref quando chega um push novo (`concurrency` com `cancel-in-progress`). O workflow DB não cancela o anterior. Espere a rodada da sua cabeça atual.

Timeout de cada job: 15 minutos. Permissão do token: só leitura do conteúdo.

### CI

Arquivo: `.github/workflows/ci.yml`. Node vem do `.nvmrc` (22). `npm ci`, não `npm install`.

O job `test` define variáveis fictícias porque `src/config/env.ts` valida o ambiente no import. A URL de banco desse job não tem servidor. A suíte não conecta. Se o seu teste passar a precisar de Postgres, o job precisa de um service container. Até lá, teste de banco de verdade não existe, e o [guia de banco](banco.md) deixa isso explícito.

`build` só compila. Não sobe container e não publica imagem.

`audit` olha dependência de produção (`--omit=dev`). Uma lib nova em `dependencies` com advisory alto quebra a `main`. Corrija ou troque a lib antes do PR. `npm audit fix --force` não é o caminho: ele sobe major e quebra o build.

### DB

Arquivo: `.github/workflows/db.yml`. Postgres 16 como service, usuário e database `gescom`, descartado no fim do job.

`db-check`, nesta ordem:

1. `npm run db:check` (drizzle-kit confere journal e snapshots).
2. `npm run db:migrate` no banco vazio. A cadeia inteira tem que aplicar do zero.
3. No pull request: busca a base e roda `tsx scripts/lint-migrations.ts --base origin/<base>`. No push da `main` esse passo não roda. O lint já passou no PR que entrou.
4. `npm run db:generate` com timeout de 60 segundos. Se `git status` mostrar qualquer coisa em `drizzle/`, o schema TypeScript e as migrations não batem. O log imprime o diff, inclusive de arquivo novo. A correção é gerar localmente e commitar a pasta.

`db-data-test` sobe em todo evento, mas o trabalho de dados só acontece quando três coisas são verdade: é pull request, o diff tem `.sql` novo em `drizzle/`, e a base já tem journal e pelo menos um `.sql`. Fora isso o job escreve o motivo e termina verde. O `if` está nos passos, não no job. Um job com `if` no nível do job, quando é check obrigatório, pode aparecer como pulado e impedir o merge.

Quando roda de verdade:

1. Arquiva a pasta `drizzle/` da base e aplica só ela (`scripts/ci/apply-migrations.ts`).
2. `scripts/ci/seed.ts` insere uma linha nas tabelas centrais e imprime as que ficaram vazias.
3. Aplica a pasta `drizzle/` do PR em cima desse dado.

Não há quarto passo de "rodar os testes da main contra o banco do PR". A suíte não usa banco. Compatibilidade com o código que está em produção continua sendo revisão humana. A pergunta está no template do pull request.

O lint, quando falha, marca o arquivo no PR (`::error` e `::warning`) e escreve uma tabela no resumo do step. Aviso repetido da mesma regra no mesmo arquivo aparece uma vez.

## O que o CI não faz

- Não aplica migration em produção. O job antigo que usava environment `production` e o secret `DATABASE_URL` saiu.
- Não publica imagem e não chama o servidor.
- Não substitui o `db:lint` local. O check falho lá é mais lento de ler do que na sua máquina.
- Não relê uma migration já mergeada para ver se ela ainda é segura. Imutabilidade (`INT-01`) existe para impedir que alguém "conserte" SQL que já rodou.

## Boas práticas para o check passar de primeira

Rode localmente o mesmo conjunto da tabela, na ordem da [rotina](rotina-do-dev.md), antes do push. O hook de pre-push cobre só `typecheck` e `db:lint`.

Mantenha a branch rebased em `origin/main`. O lint de migration usa a diferença de três pontos contra a base. Uma branch atrasada gera `INT-02` ou um SQL que não aplica em cima do que a `main` já tem.

Não edite à mão um `.sql` já commitado na `main`. Não deixe snapshot sem o `.sql` correspondente, nem o contrário. `db:generate` escreve os três juntos: SQL, snapshot e journal.

Dependência nova: prefira `dependencies` só para o que a API importa em produção. Ferramenta de lint, teste e o próprio squawk ficam em `devDependencies`. O container reinstala `tsx`, `squawk-cli` e `libpg-query` à parte justamente porque o migrate de produção precisa delas e o `npm ci --omit=dev` não as traz. Não mova essas três para `dependencies` sem necessidade: o audit de produção passaria a olhar para elas.

Actions ficam em versão major (`@v4`). Não use `pull_request_target`. Esse evento roda o workflow do base com o código do PR e abre a porta para exfiltrar secret. Este repositório não tem secret de banco no Actions, e a regra é não criar um.

## Onde cada script entra

| Script | Quem chama | Papel |
| --- | --- | --- |
| `db:generate` | você, e o `db-check` para detectar divergência | Escreve a migration a partir de `src/db/` |
| `db:migrate` | você, no banco local; `db-check`, no Postgres vazio | `drizzle-kit migrate` |
| `db:check` | você e o `db-check` | Consistência de journal e snapshots |
| `db:lint` | você e o pre-push | Lint contra `origin/main` |
| `npm test` | você e o job `test` | Unidade, sem banco |
| `prepare` | `npm ci` / `npm install` | Instala o lefthook. Falha do hook não derruba o `npm ci` da imagem |

O código do lint está em `scripts/lint-migrations.ts` e `scripts/migration-lint/`. A classificação das regras está em `scripts/migration-lint/catalog.ts` e o resumo para quem escreve SQL está em [Banco local e produção](banco.md). O catálogo humano e o código precisam andar juntos: se você adicionar uma regra, atualize os dois e o teste em `tests/migrations/lint-migrations.test.ts`.
