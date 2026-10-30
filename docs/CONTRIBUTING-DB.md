# Migrations (Drizzle)

Use só o banco local. Não coloque a URL de produção no `.env`.

## Fluxo

1. `git pull --rebase`
2. `npm run db:migrate`
3. Altere o schema em `src/db/`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:check`
7. Faça o commit do schema e da pasta `drizzle/` juntos

## Conflito de migration

Se a migration que você gerou conflitar com a `main`:

1. Descarte a sua migration (o `.sql` e o que você gerou em `drizzle/meta/`)
2. Atualize a branch com a `main`
3. `npm run db:migrate`
4. Rode `npm run db:generate` de novo

## Proibições

- Não use `drizzle-kit push`
- Não edite migration que já entrou na `main`
