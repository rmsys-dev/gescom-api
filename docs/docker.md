# Docker

A imagem leva a API compilada, o Chromium (PDF) e o que o `scripts/migrate.ts` precisa para rodar. O Postgres não entra no container. Produção aponta para um banco externo.

O GitHub Actions não constrói essa imagem e não a publica. Build e publicação são um passo seu, ou do servidor, a partir do commit que já passou nos checks. Detalhe do que o CI cobre em [CI e a branch main](ci-cd.md).

## O que tem na imagem

O `Dockerfile` tem três estágios.

1. Dependências completas, com compilador, para o `bcrypt` nativo e o TypeScript.
2. `npm run build`, que compila `src/` para `dist/`. Esse estágio não roda teste, lint nem migration.
3. Runtime. `npm ci --omit=dev` e, em seguida, a instalação avulsa de `tsx@4.23.15`, `squawk-cli@2.70.0` e `libpg-query@18.2.2`. Copia `dist/`, `drizzle/`, `scripts/`, `.squawk.toml` e `docker/entrypoint.sh`.

O processo roda como usuário `gescom`. A imagem já define `NODE_ENV=production`, `PORT=3000`, `NODE_OPTIONS=--max-old-space-size=384`, `CHROME_EXECUTABLE_PATH=/usr/bin/chromium`, `PHOTOS_DIR=fotos` e `NFE_XML_DIR=storage/nfe`. Um `--env-file` sobrescreve isso. O heap do Node fica em 384 MB para sobrar RAM ao Chromium no mesmo container; se mudar o `--memory` do `docker run`, ajuste `NODE_OPTIONS` no env.

Não é preciso clonar o repositório no servidor. A imagem já tem a pasta `drizzle/` e os scripts de migration. O que o servidor precisa é da imagem e das variáveis.

## Variáveis de banco

Copie `.env.docker.example` para `.env.docker`. O Docker não tira aspas do `--env-file`: escreva `KEY=valor`, sem aspas. O arquivo não entra no Git.

- `MIGRATION_DATABASE_URL`: conexão direta, porta 5432 ou session mode. É a que o `scripts/migrate.ts` lê. Pooler em transaction mode (porta 6543) e RDS Proxy quebram o advisory lock. Depois da migration, o entrypoint faz `unset` dessa variável para ela não ficar no processo da API.
- `DATABASE_URL`: a API em runtime. Pode ser o pooler, desde que a variável de migration esteja definida com a URL direta.
- Se `MIGRATION_DATABASE_URL` faltar, o entrypoint copia `DATABASE_URL`. Nesse caso a URL da API também tem que ser a conexão direta.

`DRIZZLE_DATABASE_URL` não é lida pelo container nem exigida pela API. Ela existe para o `drizzle-kit` na máquina do dev. Veja [Banco local e produção](banco.md).

Em produção na EC2, o usual é apontar `MIGRATION_DATABASE_URL` para um role de migrate (DDL) e `DATABASE_URL` para o role da aplicação (DML). Isso é só configuração de ambiente no servidor; o código local não impõe esses usuários.

`MIGRATION_STATEMENT_TIMEOUT` é opcional. Padrão `120s`.

## Subir na máquina, para ensaio

```bash
npm run docker:build
npm run docker:run
```

O `docker:run` publica a porta 3000, limita o container a 768 MB de RAM, reserva 1 GB de `/dev/shm` para o Chromium, monta os volumes `gescom-fotos` e `gescom-storage` e lê `.env.docker`.

A tag sai de `scripts/docker-image.ts`: versão do `package.json` e o SHA curto do commit. Exemplo: `gescom-api:1.0.0-a1b2c3d`. O build imprime a tag e a grava em `.docker-image-tag`, que não entra no Git. O `docker:run` lê esse arquivo e sobe essa imagem. Com alteração ainda não commitada, a tag ganha o instante do build (`gescom-api:1.0.0-a1b2c3d-dirty-1731174300123`), para não reaproveitar a imagem do commit limpo. A versão do `package.json` não muda neste passo.

Para repetir o `docker run` na mão, use a tag gravada:

```bash
docker run --rm -p 3000:3000 --memory=768m --shm-size=1g \
  -v gescom-fotos:/app/fotos \
  -v gescom-storage:/app/storage \
  --env-file .env.docker \
  "gescom-api:$(cat .docker-image-tag)"
```

Na EC2 Graviton (`t4g`), defina `DOCKER_DEFAULT_PLATFORM=linux/arm64` antes do `npm run docker:build`. Em host x86, use `linux/amd64`. Sem essa variável, o Docker usa a arquitetura da máquina que está buildando.

Healthcheck da imagem: `GET /health` a cada 30 segundos, com folga de 45 segundos na subida.

`--memory=768m` limita o cgroup (Node + Chromium). `--shm-size=1g` evita o Chromium morrer ao gerar PDF. Os volumes guardam foto e XML de NF-e. Sem eles, um container novo nasce sem esse arquivo.

Build local não reexecuta o CI. Construa a imagem do commit que já está verde na `main`, não de uma árvore com mudança solta.

## Ordem no deploy

O `docker/entrypoint.sh` faz o seguinte toda vez que o container sobe:

1. Preenche `MIGRATION_DATABASE_URL` com `DATABASE_URL` se a primeira estiver vazia.
2. Roda `tsx scripts/migrate.ts`.
3. Se o script sair com sucesso, remove `MIGRATION_DATABASE_URL` do ambiente e troca o processo para `node dist/server.js`.

Se a migration falhar, a API nova não sobe. Isso só preserva a versão antiga se o orquestrador ainda não a tiver derrubado. O caminho que separa as duas coisas:

1. Snapshot do banco no provedor.
2. Um container de uso único, da imagem nova, só para migrar:

   ```bash
   docker run --rm --entrypoint ./node_modules/.bin/tsx \
     --env-file .env.docker \
     "gescom-api:$(cat .docker-image-tag)" scripts/migrate.ts
   ```

3. Confira a saída. Código 0 e a lista das migrations aplicadas. Código 1: não troque a versão. A mensagem do script diz o mesmo.
4. Aí sim suba os containers da API com essa imagem.

Para ver o que seria aplicado, sem escrever:

```bash
docker run --rm --entrypoint ./node_modules/.bin/tsx \
  --env-file .env.docker \
  "gescom-api:$(cat .docker-image-tag)" scripts/migrate.ts --dry-run
```

O que o script confere (lock, journal, lint das pendentes) está em [Banco local e produção](banco.md). Não há flag para desligar o lint.

## O que conferir quando o container não sobe

- Log com `MIGRATION_DATABASE_URL` ausente: o `.env.docker` não definiu a variável e também não há `DATABASE_URL`.
- Erro de advisory lock, ou migration que "não vê" o banco que você migrou na mão: a URL passou por pooler em transaction mode. Troque para a porta 5432.
- O lint abortou: alguma migration pendente tem achado bloqueante sem `-- lint-approved`. Isso devia ter falhado no PR. Não contorne no servidor. Corrija numa migration nova, pela [rotina](rotina-do-dev.md).
- `INT` no log do migrate, falando em migration ignorada: o journal tem uma entrada com `when` atrás da última aplicada. Não edite o histórico. Alguém precisa gerar a correção em cima da `main`.
- A API sobe e cai no healthcheck: a migration pode ter passado e o problema estar em segredo, porta ou Chromium. O `/health` só responde quando o processo HTTP está no ar.
- PDF em branco ou Chromium fechando: confira `--shm-size=1g` e `CHROME_EXECUTABLE_PATH=/usr/bin/chromium`.
