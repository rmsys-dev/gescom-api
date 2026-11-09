# syntax=docker/dockerfile:1

# --- Dependências (dev + prod) para build e bcrypt nativo ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# md-to-pdf puxa puppeteer; Playwright também tenta baixar browser no postinstall.
# Na imagem usamos Chromium do apt — pular downloads de browser.
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# --- Build TypeScript ---
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime de produção ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=1 \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# scripts/migrate.ts roda com tsx e precisa do parser WASM e do squawk.
# São devDependencies; o npm ci --omit=dev não as traz.
RUN npm ci --omit=dev \
  && npm install --no-save --no-audit --no-fund \
    tsx@4.23.15 \
    squawk-cli@2.70.0 \
    libpg-query@18.2.2 \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY .squawk.toml ./
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh \
  && mkdir -p /app/fotos /app/storage/nfe \
  && groupadd --system gescom \
  && useradd --system --gid gescom --create-home --home-dir /home/gescom gescom \
  && chown -R gescom:gescom /app

# Heap do Node deixa folga para o Chromium no mesmo container.
# Ajuste NODE_OPTIONS no --env-file se o --memory do container for outro.
ENV NODE_ENV=production \
  PORT=3000 \
  NODE_OPTIONS=--max-old-space-size=384 \
  CHROME_EXECUTABLE_PATH=/usr/bin/chromium \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  PHOTOS_DIR=fotos \
  NFE_XML_DIR=storage/nfe

USER gescom

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker/entrypoint.sh"]
