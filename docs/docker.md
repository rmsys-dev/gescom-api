# Docker — Gescom API (produção)

Documentação da estrutura Docker da **gescom-api**: o que a imagem contém, o que o build e o run fazem, critérios de funcionamento, checklist de implementação e como executar em outras máquinas / VMs.

> Escopo atual: **imagem de produção** da API apontando para **PostgreSQL/Supabase externo**. Não há Postgres nem Redis no Compose; não há imagem de desenvolvimento com hot-reload.

Documentação resumida também no [README.md](../README.md).

---

## 1. Visão geral da arquitetura

```text
Cliente HTTP
    │
    ▼
┌───────────────────────────────────────┐
│  Container gescom-api                 │
│  - Node 22 (user gescom, não-root)    │
│  - Express em dist/server.js          │
│  - Chromium (PDF / Playwright)        │
│  - drizzle-kit (migrate no start)     │
│  - Volumes: fotos + storage (NF-e)    │
└───────────────────────────────────────┘
    │                    │
    │ DATABASE_URL       │ RESEND_API_KEY
    ▼                    ▼
 PostgreSQL/Supabase   Resend (e-mail)
 (externo)
```

| Componente | Onde fica | Observação |
|------------|-----------|------------|
| API Express | Dentro do container | Porta padrão `3000` |
| Migrations Drizzle | Pasta `drizzle/` na imagem; aplicadas no start | Via `drizzle.migrate.config.ts` |
| Chromium | Pacote apt na imagem | `CHROME_EXECUTABLE_PATH=/usr/bin/chromium` |
| Fotos / XML NF-e | Volumes `gescom-fotos` / `gescom-storage` | Persistência fora do ciclo de vida do container |
| PostgreSQL | **Externo** (Supabase ou outro) | Não sobe no Docker |
| Redis / BullMQ | Não usados no container | Dependências no `package.json`, sem uso em runtime Docker |
| Seeds (`scripts/`) | Fora da imagem | Pasta `scripts/` está no `.gitignore` |

---

## 2. Arquivos da estrutura Docker

| Arquivo | Função |
|---------|--------|
| [`Dockerfile`](../Dockerfile) | Build multi-stage da imagem de produção |
| [`.dockerignore`](../.dockerignore) | Exclui do contexto de build o que não deve ir para a imagem |
| [`docker/entrypoint.sh`](../docker/entrypoint.sh) | Migrate + start da API |
| [`drizzle.migrate.config.ts`](../drizzle.migrate.config.ts) | Config enxuta do Drizzle só para `migrate` (sem schemas TS de `src/`) |
| [`.env.docker.example`](../.env.docker.example) | Template versionado das variáveis |
| `.env.docker` | Secrets locais (**não versionar**) |
| Scripts npm `docker:build` / `docker:run` | Atalhos no [`package.json`](../package.json) |

### O que o `.dockerignore` impede de entrar no contexto

- `node_modules`, `dist`, `.git`, caches, testes, logs
- Arquivos `.env*` (exceto `.env.example` e `.env.docker.example`)
- Pastas locais: `docs`, `scripts`, `performance`, `fotos`, `storage`, etc.
- Certificados e markdowns

Isso reduz o contexto de build e evita vazar secrets / dados locais para a imagem.

---

## 3. O que o `docker:build` gera

Comando:

```bash
npm run docker:build
# equivalente: docker build -t gescom-api:latest .
```

### Stages do Dockerfile

#### Stage `deps`

1. Base: `node:22-bookworm-slim`
2. Instala toolchain (`python3`, `make`, `g++`) para compilar **bcrypt** (addon nativo)
3. Define `PUPPETEER_SKIP_DOWNLOAD=1` e `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`  
   (evita falha do postinstall do Puppeteer vindo de `md-to-pdf`; o PDF usa Chromium do apt)
4. `npm ci` (dev + prod) para o build TypeScript

#### Stage `build`

1. Copia `node_modules` do stage `deps`
2. Copia `src/` e `tsconfig.json`
3. `npm run build` → gera `dist/` (JavaScript compilado)

#### Stage `runtime` (imagem final)

1. Instala **Chromium**, fontes e CA certificates
2. Instala toolchain temporária, `npm ci --omit=dev`, depois `drizzle-kit@0.31.10` com `--save-prod` (necessário no entrypoint; como é `devDependency` no repo, `--omit=dev` sozinho não o inclui)
3. Remove toolchain (`python3`, `make`, `g++`) para reduzir a imagem
4. Copia para `/app`:
   - `dist/` (inclui assets de impressão e schemas XSD da NF-e copiados no `npm run build`)
   - `drizzle/` (SQL de migrations)
   - `drizzle.migrate.config.ts`
   - `docker/entrypoint.sh`
5. Cria pastas `fotos/` e `storage/nfe/`, usuário não-root `gescom` e dá ownership de `/app`
6. Define envs padrão: `NODE_ENV=production`, `PORT=3000`, `CHROME_EXECUTABLE_PATH=/usr/bin/chromium`, `PHOTOS_DIR`, `NFE_XML_DIR`
7. Expõe porta `3000`
8. Configura `HEALTHCHECK` em `GET /health`
9. `ENTRYPOINT` = `./docker/entrypoint.sh`

### Artefato resultante

- Imagem tagueada: `gescom-api:latest`
- Contém apenas o necessário para **rodar em produção** (não inclui `src/` TypeScript, testes, nodemon, etc.)
- Tamanho elevado por causa do **Chromium** (esperado)

### Verificações pós-build

```bash
docker images gescom-api
docker inspect gescom-api:latest --format '{{.Config.User}} {{.Config.ExposedPorts}} {{.Config.Entrypoint}}'
# esperado: gescom | map[3000/tcp:{}] | [./docker/entrypoint.sh]
```

---

## 4. O que o `docker:run` faz

Comando:

```bash
npm run docker:run
# equivalente:
# docker run --rm -p 3000:3000 --shm-size=1g \
#   -v gescom-fotos:/app/fotos \
#   -v gescom-storage:/app/storage \
#   --env-file .env.docker gescom-api:latest
```

### Flags importantes

| Flag | Motivo |
|------|--------|
| `--rm` | Remove o container ao parar (não deixa lixo local) |
| `-p 3000:3000` | Publica a porta da API no host |
| `--shm-size=1g` | Memória compartilhada maior — evita crashes do Chromium ao gerar PDF |
| `-v gescom-fotos:/app/fotos` | Persiste fotos de membros/produtos |
| `-v gescom-storage:/app/storage` | Persiste XML de NF-e (`storage/nfe`) |
| `--env-file .env.docker` | Injeta variáveis de ambiente |

### Sequência do entrypoint

1. Log: `[entrypoint] Aplicando migrations...`
2. Executa:
   ```bash
   ./node_modules/.bin/drizzle-kit migrate --config=drizzle.migrate.config.ts
   ```
   - Usa `DRIZZLE_DATABASE_URL` (ou fallback `DATABASE_URL`)
   - Aplica SQL em `drizzle/` / tabela `__drizzle_migrations` no schema `drizzle`
   - Se já estiver migrado, tende a ser no-op
3. Log: `[entrypoint] Iniciando API...`
4. `exec node dist/server.js` (PID 1 do container = processo Node — recebe `SIGTERM` corretamente)

### Shutdown graceful

Em `SIGTERM` / `SIGINT` (ex.: `docker stop`):

1. Fecha o browser Chromium (`closePdfBrowser`)
2. Fecha o servidor HTTP
3. Sai com código 0 (ou 1 em erro)

---

## 5. Variáveis de ambiente

Validação no boot: [`src/config/env.ts`](../src/config/env.ts) (Zod). Se faltar variável obrigatória, o processo **não sobe**.

### Regras críticas do `.env.docker`

1. **Sem aspas** em valores.  
   Docker `--env-file` **não remove** aspas (diferente do `dotenv` local).  
   Errado: `DATABASE_URL="postgresql://..."` → vira URL inválida com `"` literal.  
   Certo: `DATABASE_URL=postgresql://...`
2. **Não versionar** `.env.docker` (já está no `.gitignore`).
3. Template: copiar de `.env.docker.example`.

```bash
cp .env.docker.example .env.docker
# editar valores reais SEM aspas
```

### Banco (Supabase / Postgres)

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Conexão da aplicação (Drizzle ORM / `postgres`) |
| `DRIZZLE_DATABASE_URL` | Conexão do `drizzle-kit migrate` |

**Obrigatório para migrate:** porta **5432** (conexão direta ou *session mode*).  
**Não usar** o pooler de *transaction* na porta **6543** — quebra migrations.

O hostname do pooler Supabase na porta `5432` (session) é aceitável; o problema é especificamente o modo transaction/`6543`.

### Outras variáveis relevantes

| Grupo | Exemplos |
|-------|----------|
| Runtime | `NODE_ENV=production`, `PORT=3000` |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET` (mín. 32 chars), issuer/audience/TTL |
| Auth / rate limit | `BCRYPT_ROUNDS`, `AUTH_*`, `API_RATE_LIMIT_*` |
| Maintainer | `MAINTAINER_API_KEY` (mín. 32 chars) |
| E-mail | `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME` |
| CORS | `CORS_ORIGINS` (lista separada por vírgulas) |
| NF-e | `NFE_SECRETS_KEY` (mín. 32 chars), `NFE_TIMEOUT_MS`, `NFE_XML_DIR` |
| Fotos | `PHOTOS_DIR` (padrão `fotos`) |
| PDF | `CHROME_EXECUTABLE_PATH=/usr/bin/chromium` (já default na imagem) |

Lista completa: [`.env.docker.example`](../.env.docker.example).

---

## 6. Critérios de funcionamento (aceitação)

A instalação Docker está **ok** quando:

| # | Critério | Como verificar |
|---|----------|----------------|
| 1 | Build conclui sem erro | `npm run docker:build` → exit 0 |
| 2 | Container inicia e aplica migrate | Logs mostram migrate + “Iniciando API” sem stack trace |
| 3 | Health responde | `curl http://localhost:3000/health` → HTTP 200 |
| 4 | Env válida | Sem `Invalid environment variables` no log |
| 5 | URL do banco sem aspas | Sem `TypeError: Invalid URL` no migrate |
| 6 | DB acessível da máquina/VM | Sem timeout / ECONNREFUSED no migrate |
| 7 | PDF encontra Chromium | Impressão de OS não retorna `PDF_ENGINE_UNAVAILABLE` por browser ausente |
| 8 | Stop limpo | `docker stop <id>` encerra sem zombie; exit esperado |

### Healthcheck interno do Docker

Definido no Dockerfile:

- Intervalo: 30s  
- Timeout: 5s  
- Start period: 45s (tempo para migrate + boot)  
- Retries: 3  
- Comando: `fetch` em `http://127.0.0.1:$PORT/health`

```bash
docker ps  # STATUS deve ir para (healthy) após o start-period
```

---

## 7. Checklist de implementação / deploy

Use ao provisionar a API em um ambiente novo.

### Pré-requisitos da máquina host

- [ ] Docker Engine instalado e daemon ativo (`docker version`)
- [ ] Acesso de rede ao PostgreSQL/Supabase (firewall / security group liberado para o IP da VM)
- [ ] Arquivo `.env.docker` preenchido **sem aspas**
- [ ] `DRIZZLE_DATABASE_URL` e `DATABASE_URL` na porta **5432**
- [ ] Secrets JWT / Maintainer / Resend / `NFE_SECRETS_KEY` válidos
- [ ] Volumes (ou bind mounts) para `fotos` e `storage` se for produção
- [ ] Disco suficiente (imagem com Chromium ocupa centenas de MB a ~1+ GB)

### Build

- [ ] Código na revisão/tag desejada
- [ ] `npm run docker:build` (ou build em CI e push para registry)
- [ ] Tag coerente com o ambiente (`gescom-api:latest`, `gescom-api:1.0.0`, etc.)

### Run

- [ ] Porta host livre (ou mapear outra: `-p 8080:3000`)
- [ ] `--shm-size=1g` presente se PDF for usado
- [ ] `--env-file` apontando para o arquivo correto do ambiente
- [ ] Health `200` após subida
- [ ] Teste rápido de login / rota autenticada (smoke)
- [ ] Teste de geração de PDF (se aplicável)

### Operação

- [ ] Política de restart (`--restart unless-stopped` em VM/servidor)
- [ ] Logs centralizados ou `docker logs` documentado
- [ ] Plano de update: build nova tag → stop antigo → run novo
- [ ] Backup/acesso ao banco externo independente do container

### Fora do escopo atual (não esperar na imagem)

- [ ] Postgres local via Compose
- [ ] Seeds automáticos (`scripts/` não entram na imagem)
- [ ] Redis / filas BullMQ
- [ ] Hot-reload / volume de `src`

---

## 8. Como rodar em outras máquinas e VMs

### 8.1 Mesmo repositório (dev/ops local)

Na máquina com o código:

```bash
git clone <repo-privado> && cd gescom-api
cp .env.docker.example .env.docker
# editar .env.docker
npm run docker:build
npm run docker:run
```

Não é necessário `npm install` no host para build/run Docker (o build ocorre dentro dos stages). Útil ter Node no host só para scripts locais fora do Docker.

### 8.2 VM / servidor (recomendado para produção simples)

**Opção A — build na própria VM**

1. Instalar Docker na VM  
2. Clonar o repositório (ou copiar artefatos)  
3. Criar `.env.docker` no servidor (secrets via scp / vault / secret manager — **não** commit)  
4. `docker build -t gescom-api:VERSION .`  
5. Subir com restart:

```bash
docker run -d \
  --name gescom-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --shm-size=1g \
  -v gescom-fotos:/app/fotos \
  -v gescom-storage:/app/storage \
  --env-file /caminho/seguro/.env.docker \
  gescom-api:VERSION
```

**Opção B — build em CI + registry (preferível em escala)**

1. CI faz `docker build` e `docker push` para um registry (GHCR, ECR, Docker Hub privado, etc.)  
2. Na VM:

```bash
docker login <registry>
docker pull <registry>/gescom-api:VERSION
docker run -d \
  --name gescom-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --shm-size=1g \
  -v gescom-fotos:/app/fotos \
  -v gescom-storage:/app/storage \
  --env-file /caminho/seguro/.env.docker \
  <registry>/gescom-api:VERSION
```

Assim a VM não precisa do código-fonte nem de toolchain de build.

### 8.3 Behind reverse proxy (Nginx / Caddy / Traefik)

- Mapear proxy → `http://127.0.0.1:3000` (ou rede Docker)
- A API já usa `trust proxy` (`app.set("trust proxy", 1)`), adequado atrás de proxy
- Configurar `CORS_ORIGINS` com a origem real do frontend (HTTPS)
- TLS termina no proxy; o container pode permanecer em HTTP interno

Exemplo mínimo de exposição:

```text
Internet → :443 (Nginx TLS) → 127.0.0.1:3000 (container)
```

### 8.4 Portas e firewall

| Direção | Porta | Destino |
|---------|-------|---------|
| Entrada na VM | 80/443 (ou 3000 se exposto direto) | Proxy ou container |
| Saída da VM | 5432 (ou endpoint Supabase) | Postgres |
| Saída da VM | 443 | Resend / SEFAZ / APIs externas |

Garantir que o **IP público (ou egress) da VM** está liberado no Supabase / security group do banco.

### 8.5 Atualização / rollback

```bash
# sobe nova versão
docker pull <registry>/gescom-api:NOVA
docker stop gescom-api && docker rm gescom-api
docker run -d --name gescom-api ... <registry>/gescom-api:NOVA

# rollback
docker stop gescom-api && docker rm gescom-api
docker run -d --name gescom-api ... <registry>/gescom-api:ANTERIOR
```

Migrations rodam no start: **não faça rollback de imagem** se a migration nova for incompatível com o schema antigo sem um plano de DB.

### 8.6 Windows (Docker Desktop)

- Usar o mesmo `npm run docker:build` / `docker:run`
- Garantir que o Docker Desktop está **Running** (engine Linux)
- Paths do `--env-file` funcionam a partir do diretório do projeto
- Line endings do `entrypoint.sh` devem ser **LF** (já versionado assim); se editar no Windows, não converter para CRLF

### 8.7 Recursos sugeridos na VM

| Recurso | Sugestão mínima |
|---------|-----------------|
| RAM | 1–2 GB livres para o container (Chromium + Node) |
| CPU | 1–2 vCPU |
| Disco | Espaço para imagem + logs |
| `shm` | `--shm-size=1g` (obrigatório para PDF estável) |

---

## 9. Comandos úteis no dia a dia

```bash
# logs em tempo real
docker logs -f gescom-api

# status / health
docker ps
curl -s http://localhost:3000/health

# entrar no container (debug)
docker exec -it gescom-api sh

# confirmar Chromium
docker exec gescom-api ls -l /usr/bin/chromium

# parar / remover
docker stop gescom-api
docker rm gescom-api

# limpar imagens antigas (cuidado)
docker image prune
```

Rodar sem `--rm` e com nome (servidor):

```bash
docker run -d --name gescom-api --restart unless-stopped \
  -p 3000:3000 --shm-size=1g \
  -v gescom-fotos:/app/fotos \
  -v gescom-storage:/app/storage \
  --env-file .env.docker gescom-api:latest
```

O script `npm run docker:run` usa `--rm` e modo foreground — ideal para teste local, não para daemon em VM.

---

## 10. Troubleshooting

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| `Failed to set up chrome` / Puppeteer no **build** | Download de browser no `npm ci` | Já tratado com `PUPPETEER_SKIP_DOWNLOAD`; rebuild com Dockerfile atual |
| `Cannot find module 'drizzle-kit'` no **run** | Kit não instalado / `npx` baixando outra cópia | Imagem deve ter `drizzle-kit` via `--save-prod` e entrypoint com `./node_modules/.bin/drizzle-kit` |
| `TypeError: Invalid URL` com aspas no input | Aspas no `.env.docker` | Remover aspas de todos os valores |
| Migrate falha / timeouts | Porta 6543, firewall, senha, SSL | Usar 5432 session; liberar IP; conferir connection string |
| `Invalid environment variables` | Env faltando ou inválida (Zod) | Conferir obrigatórias em `env.ts` / example |
| PDF `PDF_ENGINE_UNAVAILABLE` | Chromium ausente ou path errado | Confirmar `/usr/bin/chromium` e `CHROME_EXECUTABLE_PATH`; usar `--shm-size=1g` |
| Container exit logo após start | Migrate falhou (`set -e` no entrypoint) | Ver logs; corrigir DB/env; só então a API sobe |
| Porta em uso | Outro processo no host `:3000` | `-p 3001:3000` ou liberar a porta |
| Health fica `unhealthy` | API lenta no boot ou falha | Aumentar start-period; checar logs e `/health` |

---

## 11. Segurança (resumo)

- Rodar como usuário **não-root** (`gescom`)
- Nunca commitar `.env.docker`
- Preferir secrets manager / arquivos só no servidor com permissão restrita (`chmod 600`)
- Expor a API via HTTPS no proxy; não expor Postgres publicamente além do necessário
- Rotacionar credenciais se vazarem em chat, ticket ou log
- Imagem privada: registry autenticado; repositório já é confidencial RMSys

---

## 12. Fluxo mental rápido

```text
1. Preparar .env.docker (sem aspas, DB 5432, secrets)
2. docker build -t gescom-api:TAG .
3. docker run ... --shm-size=1g --env-file .env.docker gescom-api:TAG
4. entrypoint: migrate → node dist/server.js
5. GET /health → 200
6. (opcional) smoke auth + PDF
```

---

## 13. Referência rápida de scripts

| Script | Comando efetivo |
|--------|-----------------|
| `npm run docker:build` | `docker build -t gescom-api:latest .` |
| `npm run docker:run` | `docker run --rm -p 3000:3000 --shm-size=1g -v gescom-fotos:/app/fotos -v gescom-storage:/app/storage --env-file .env.docker gescom-api:latest` |

Para produção em VM, prefira `docker run -d --name ... --restart unless-stopped` em vez do script `docker:run`.
