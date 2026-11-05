## Checklist de banco

- [ ] Rodei `db:generate`, `db:migrate` e `db:check` localmente
- [ ] Rodei `db:lint` localmente
- [ ] Conferi o `.sql` gerado (sem DROP/TRUNCATE indevido; rename aparece como `RENAME COLUMN`)
- [ ] Esta migration funciona com o código que está em produção hoje?
- [ ] Cada `-- lint-approved` tem motivo real e foi revisado pelo Code Owner?
- [ ] Colunas novas `NOT NULL` têm default ou backfill
