# Gescom API

Backend do **Gescom**, sistema web **ERP** da **RMSys**.

## Confidencialidade

Este repositório é **privado** e de uso exclusivo da RMSys. O código-fonte é **proprietário e confidencial**: não pode ser copiado, distribuído, replicado ou utilizado fora do escopo autorizado pela empresa. O acesso é restrito a colaboradores e parceiros com permissão explícita.

## Licença e propriedade intelectual

Copyright © **RMSys**. Todos os direitos reservados.

Este software é **proprietário** e licenciado de forma **exclusiva** para a RMSys e seu uso interno no ecossistema Gescom. Não é software de código aberto: a reprodução, redistribuição, engenharia reversa, sublicenciamento ou qualquer uso não autorizado é **expressamente proibido**.

Para dúvidas sobre acesso, uso ou permissões, entre em contato com a RMSys.

## Docker (produção)

Imagem multi-stage da API com Chromium para geração de PDF. O banco PostgreSQL/Supabase é **externo** (não há Postgres no container).

Documentação completa (build, run, checklist, VMs, troubleshooting): [`docs/docker.md`](docs/docker.md).

### Pré-requisitos

- Docker instalado
- PostgreSQL acessível (Supabase ou outro) — use a porta **5432** (session mode) em `DRIZZLE_DATABASE_URL`; **não** use o pooler `6543`
- Conta Resend e demais secrets (JWT, `MAINTAINER_API_KEY`, `NFE_SECRETS_KEY`, etc.)

### Configuração

```bash
cp .env.docker.example .env.docker
# Edite .env.docker com valores reais (arquivo local, nao versionado)
# Docker --env-file NAO remove aspas: use KEY=value sem aspas
```

### Build e execução

```bash
npm run docker:build
npm run docker:run
```

Equivalente:

```bash
docker build -t gescom-api:latest .
docker run --rm -p 3000:3000 --shm-size=1g \
  -v gescom-fotos:/app/fotos \
  -v gescom-storage:/app/storage \
  --env-file .env.docker gescom-api:latest
```

No start, o entrypoint aplica migrations (`drizzle-kit migrate --config=drizzle.migrate.config.ts`) e sobe a API. Healthcheck: `GET /health`.

`--shm-size=1g` evita falhas do Chromium ao gerar PDF. Volumes `gescom-fotos` e `gescom-storage` persistem fotos e XML de NF-e. O path padrão do browser na imagem é `CHROME_EXECUTABLE_PATH=/usr/bin/chromium`.
