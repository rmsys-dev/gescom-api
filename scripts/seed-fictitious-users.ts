/**
 * Cria usuarios ficticios (idempotente por CPF).
 * Nao cria credenciais nem vinculos com empresa — apenas registros em `users`.
 *
 * Uso: `npm run seed:fictitious-users` ou `npx tsx scripts/seed-fictitious-users.ts`
 *
 * Para volume completo de testes, prefira: `npm run seed:test-data`
 */
import "dotenv/config";
import {
  LEGACY_FICTITIOUS_USERS,
  seedFictitiousUsers,
} from "./seed/modules/fictitious-users.js";

async function seed(): Promise<void> {
  const count = process.env.SEED_FICTITIOUS_USERS_COUNT
    ? Number.parseInt(process.env.SEED_FICTITIOUS_USERS_COUNT, 10)
    : LEGACY_FICTITIOUS_USERS.length;

  if (!Number.isFinite(count) || count < 1) {
    throw new Error("SEED_FICTITIOUS_USERS_COUNT invalido.");
  }

  await seedFictitiousUsers(count);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
