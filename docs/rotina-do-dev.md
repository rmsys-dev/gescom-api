# Rotina do dev

Este guia é o caminho curto para abrir a branch, validar o que você mudou e abrir um pull request que a `main` aceite. A `main` não recebe push direto. Tudo entra por pull request, com squash, e os checks descritos em [CI e a branch main](ci-cd.md) precisam estar verdes.

Use Node **22**, que é o que está no `.nvmrc` e no `engines` do `package.json`. O CI instala essa versão. Um Node mais novo na sua máquina pode instalar, mas o aviso `EBADENGINE` significa que você não está no mesmo runtime do CI.

## Antes de codar

1. Atualize a `main` local e crie a branch a partir dela.
   ```bash
    git checkout main
    git pull --rebase
    git checkout -b feat/assunto-curto
   ```
2. Confirme o `.env` na raiz, copiado de `.env.example`. Esse arquivo não entra no Git. `DATABASE_URL` e `DRIZZLE_DATABASE_URL` apontam para o **seu** Postgres, nunca para produção. Detalhe das duas URLs em [Banco local e produção](banco.md).
3. Instale e suba o que já está na `main` no seu banco:

   ```bash
    npm ci
    npm run db:migrate
   ```

   O `npm ci` também instala o hook de pre-push (lefthook), pelo script `prepare`.

4. Suba a API com `npm run dev` quando for exercitar a rota. O `dev` não aplica migration. Se o schema mudou na `main` e você não rodou `db:migrate`, a API sobe contra um banco velho.

O código da API fica em `src/`. O schema do Drizzle está em `src/db/` (`schema.ts` reexporta as entidades). Cada área de negócio é um módulo em `src/modules/` (auth, vendas, NF-e, estoque, financeiro, produtos, empresas, endereços, e assim por diante). Configuração obrigatória de ambiente passa por `src/config/env.ts`: se faltar variável, o processo nem sobe.

## Como testar

Rode isto na branch, antes do push, quando a mudança tocar código:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

O que cada um cobre:

| Comando             | O que verifica                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- |
| `npm run typecheck` | `tsc --noEmit` em `src/` e, em seguida, nos scripts de migration e nos testes do linter |
| `npm run lint`      | ESLint no repositório, com zero warnings                                                |
| `npm test`          | `tsx --test tests/**/*.test.ts`. São testes de unidade. Não abrem PostgreSQL            |
| `npm run build`     | Compila `src/` para `dist/` e copia os assets de impressão                              |

Para um arquivo só:

```bash
npx tsx --test tests/nfe/nfe-tax-xml.test.ts
```

Teste novo fica ao lado do assunto, em `tests/`, com sufixo `.test.ts`, no mesmo runner (`node:test` via `tsx`). Não dependa de banco, segredo ou serviço externo. O job `test` do CI usa variáveis fictícias e não sobe Postgres.

Se a mudança mexe em schema, o bloco de banco abaixo é obrigatório. Typecheck e teste de unidade não enxergam SQL.

## Como validar uma mudança de banco

Siga a ordem. Pular um passo é o que mais devolve pull request.

```bash
npm run db:migrate
# altere src/db/
npm run db:generate
npm run db:migrate
npm run db:check
npm run db:lint
```

Abra o `.sql` gerado em `drizzle/` e leia. O commit leva o schema e a pasta `drizzle/` juntos. O que o lint bloqueia, o que pode ir numa migration só e como a produção aplica isso está em [Banco local e produção](banco.md).

`db:lint` compara com `origin/main`. Se essa ref não existir na sua máquina, o comando sai em silêncio sem checar nada. Rode `git fetch origin` antes.

## Commits

A mensagem segue [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). O merge na `main` é sempre **squash**: os commits da branch somem e o que fica no histórico é o título do pull request. Escreva o título do PR como se fosse o commit da `main`. Os commits intermediários podem ser menores, mas no mesmo formato, para o review ler a história.

Formato:

```text
<tipo>(<escopo opcional>): <descrição no imperativo>

<corpo opcional: o que mudou e por quê>

<rodapé opcional>
```

A descrição é curta, no imperativo, sem ponto final. `feat(vendas): calcula o DIFAL por dentro`, não `feat: adicionadas alterações`.

Tipos que usamos:

| Tipo       | Quando                                                         |
| ---------- | -------------------------------------------------------------- |
| `feat`     | Comportamento novo visível para quem usa a API                 |
| `fix`      | Correção de bug                                                |
| `refactor` | Mudança interna sem alterar o comportamento                    |
| `perf`     | Melhoria de desempenho                                         |
| `test`     | Só testes                                                      |
| `docs`     | Só documentação                                                |
| `style`    | Formatação, sem mudança de lógica                              |
| `build`    | Build, dependências, Dockerfile                                |
| `ci`       | GitHub Actions, hooks, checks                                  |
| `chore`    | O resto que não entra nos tipos acima                          |
| `revert`   | Reverte um commit. Use `revert:` seguido do cabeçalho original |

Escopo é o módulo ou a área: `vendas`, `nfe`, `db`, `auth`, `ci`. Omita se a mudança atravessa o projeto.

Quebra de contrato (campo removido, rota que muda de formato, migration que o código antigo não aguenta) leva `!` depois do tipo, ou um rodapé:

```text
feat(db)!: remove a coluna legado de preco

BREAKING CHANGE: a coluna prices.legacy_amount sai nesta versão. O deploy anterior já parou de lê-la.
```

Exemplos no tamanho certo:

```text
feat(nfe): preenche o grupo IBS/CBS no item
fix(estoque): trava a saída quando o lote está bloqueado
test(financeiro): cobre limite de crédito no mês da venda
ci: exige db-data-test no ruleset da main
docs: descreve a rotina de migration local
```

Um commit, um assunto. Schema e o SQL gerado vão no mesmo commit. Não misture um refactor largo com a correção que você quer que o review enxergue.

Não commite `.env`, `.env.docker`, certificado, foto ou XML de nota. O `.gitignore` já deixa isso de fora. Se um desses aparecer no `git status`, tire do stage.

## Push e pull request

Antes do push, com a branch atualizada:

```bash
git fetch origin
git rebase origin/main
npm run typecheck
npm run lint
npm test
npm run db:check
npm run db:lint
```

`db:check` e `db:lint` entram quando houver algo em `src/db/` ou `drizzle/`. Os outros quatro entram sempre que houver código.

O hook de `pre-push` roda só `db:lint` e `typecheck`. É um aviso rápido. Pode ser pulado com `LEFTHOOK=0 git push` ou `--no-verify`, e **não** substitui o que você rodou acima nem o CI. Se `origin/main` não estiver na máquina, o `db:lint` do hook não faz nada e o push segue.

Na sua branch, depois de um rebase, atualize o remoto com:

```bash
git push --force-with-lease
```

Force push na `main` é recusado pelo ruleset. Na branch do PR, `--force-with-lease` é o jeito seguro de republicar o rebase: ele aborta se alguém empurrou commit que você ainda não tem.

Abra o PR contra `main`. Título no formato de commit, acima. Preencha o checklist de banco quando houver migration. O que a `main` exige para o merge:

- A branch está em dia com a `main`. Se a `main` andou, faça rebase e espere os checks de novo.
- Os sete checks verdes: `typecheck`, `lint`, `test`, `build`, `audit`, `db-check`, `db-data-test`.
- Uma aprovação do code owner (`@rmsys-dev` é dono de todo o repositório). Aprovação antiga não vale: um push novo dispensa o review, e a aprovação tem que ser do último push.
- Toda conversa de review resolvida.
- O merge é squash. Não existe merge commit nem rebase-merge na `main`.

Quem causa PR recusado com mais frequência: migration gerada em cima de uma `main` velha, `.sql` que o lint bloqueia, schema commitado sem a pasta `drizzle/`, teste que só passa na máquina, ou título de PR que não descreve a mudança.
