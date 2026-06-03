# Gescom API

API HTTP em **Node.js** e **TypeScript** (Express) para o ecossistema Gescom: autenticação, empresas, departamentos, membros e usuários. Persistência com **PostgreSQL** via **Drizzle ORM**.

## Requisitos

- [Node.js](https://nodejs.org/) 20 ou superior (recomendado LTS atual)
- [npm](https://www.npmjs.com/) (vem com o Node)
- Instância de **PostgreSQL** acessível por URL de conexão

## Instalação

```bash
git clone <url-do-repositório>
cd gescom_api
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto. O carregamento é feito com `dotenv` em [`src/config/env.ts`](src/config/env.ts).

### Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do PostgreSQL usada pela aplicação em runtime (ex.: pooler Supabase em modo transação). Deve ser uma URL válida (`postgresql://...`). |
| `DRIZZLE_DATABASE_URL` | URL do PostgreSQL para o **Drizzle Kit** (migrações/CLI). Prefira conexão **direta** (porta `5432`) ou session mode; evite transaction pooler (`6543`) para ferramentas CLI — ver comentários em [`drizzle.config.ts`](drizzle.config.ts). |
| `JWT_SECRET` | Segredo para assinatura do access token (mínimo **32** caracteres). |
| `JWT_REFRESH_SECRET` | Segredo para o refresh token (mínimo **32** caracteres). |
| `RESEND_API_KEY` | Chave da API [Resend](https://resend.com/) para envio de e-mail. |
| `MAIL_FROM` | E-mail remetente válido (formato exigido pelo provedor). |
| `CORS_ORIGINS` | Lista separada por **vírgulas** de origens permitidas (ex.: `http://localhost:5173`). Pelo menos **uma** origem é necessária para o servidor subir — ver [`src/config/http.ts`](src/config/http.ts). |

### Opcionais (valores padrão)

| Variável | Padrão |
|----------|--------|
| `NODE_ENV` | `development` (`development` \| `test` \| `production`) |
| `PORT` | `3000` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `12` |
| `MAIL_FROM_NAME` | `Gescom` |
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` |
| `AUTH_LOCK_BASE_MINUTES` | `5` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` |
| `AUTH_RATE_LIMIT_MAX` | `20` |
| `FIRST_ACCESS_RATE_LIMIT_WINDOW_MS` | `900000` |
| `FIRST_ACCESS_RATE_LIMIT_MAX` | `5` |
| `FIRST_ACCESS_EMAIL_LIMIT_WINDOW_MINUTES` | `60` |
| `FIRST_ACCESS_EMAIL_LIMIT_MAX` | `3` |
| `INVITATION_CODE_TTL_MINUTES` | `60` |
| `INVITATION_MAX_ATTEMPTS` | `5` |
| `INVITATION_CODE_LENGTH` | `6` |

Exemplo mínimo (substitua pelos seus valores reais):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:senha@host:6543/banco?sslmode=require
DRIZZLE_DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=require
JWT_SECRET=substitua-por-uma-string-secreta-com-pelo-menos-32-caracteres
JWT_REFRESH_SECRET=outra-string-secreta-com-pelo-menos-32-caracteres
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=noreply@seudominio.com
CORS_ORIGINS=http://localhost:5173
```

Se alguma variável obrigatória estiver inválida, a aplicação falha na inicialização com mensagem listando os erros do schema.

## Banco de dados

Gerar migrações (quando o schema mudar):

```bash
npm run db:generate
```

Aplicar migrações:

```bash
npm run db:migrate
```

Sincronizar schema sem arquivo de migração (útil só em desenvolvimento, com cuidado):

```bash
npm run db:push
```

Interface visual do Drizzle:

```bash
npm run db:studio
```

Scripts adicionais: `db:migrate:pending` e `seed:bootstrap` — ver [`package.json`](package.json).

## Rodar o projeto

**Desenvolvimento** (recarrega ao alterar arquivos em `src/`):

```bash
npm run dev
```

**Pasta de rede ou erro de watch** — em drives mapeados (`Z:`, NAS, etc.) o nodemon pode falhar com `Internal watch failed: UNKNOWN`. Use polling (mais lento, mas estável):

```bash
npm run dev:poll
```

Alternativa: clone o repositório em disco local (ex.: `C:\dev\gescom_api`) e use `npm run dev` normalmente.

**Produção** (compilar e executar o JavaScript gerado):

```bash
npm run build
npm start
```

O servidor escuta na porta definida em `PORT` (padrão **3000**). Mensagem esperada no console: `Servidor rodando na porta <PORT>`.

## Verificação rápida

- **Health:** `GET http://localhost:3000/health` — retorna status e timestamp.
- **API:** prefixo base `http://localhost:3000/api/v1` (ex.: `/api/v1/auth`, `/api/v1/enterprises` e rotas aninhadas por empresa).

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor em modo desenvolvimento com `nodemon` + `tsx` |
| `npm run dev:poll` | Igual ao `dev`, com `--legacy-watch` (recomendado em pasta de rede) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Executa `dist/server.js` |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm test` | Testes unitários (`src/**/*.test.ts`) |
| `npm run test:integration` | Testes de integração |
| `npm run seed:bootstrap` | Seed idempotente (estrutura inicial; ver cabeçalho do script) |

Coleções Postman e variáveis globais estão em [`docs/postman-collections/`](docs/postman-collections/); há scripts `postman:*` no `package.json` para execução com [Newman](https://www.npmjs.com/package/newman). Endereços: `postman:addresses` (GET público em `/api/v1/addresses/*`) e `postman:addresses:maintainer` (POST/PATCH em `/api/v1/maintainer/*`).

## Estrutura (resumo)

- `src/server.ts` — entrada HTTP
- `src/app.ts` — middlewares, `/health`, montagem de `/api`
- `src/routes/` — roteamento da API
- `src/modules/` — domínios (auth, enterprises, departments, memberships, users, etc.)
- `src/db/` — cliente Drizzle e `schema.ts`
- `drizzle/` — artefatos de migração gerados pelo Drizzle Kit
- `scripts/` — utilitários (migração pendente, seed, carga)

## Licença

ISC (conforme [`package.json`](package.json)).
