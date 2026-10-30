## Checklist de banco

- [ ] Rodei `db:generate`, `db:migrate` e `db:check` localmente
- [ ] Conferi o `.sql` gerado (sem DROP/TRUNCATE indevido; rename aparece como `RENAME COLUMN`)
- [ ] Migration destrutiva está marcada com `-- destructive-approved` e justificada
- [ ] Colunas novas `NOT NULL` têm default ou backfill
