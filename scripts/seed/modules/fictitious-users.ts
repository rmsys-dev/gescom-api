import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { users } from "../../../src/db/schema.js";
import { createUser } from "../../../src/modules/auth/repository.js";
import { normalizeCpf, normalizeEmail } from "../../../src/modules/auth/password.js";
import {
  BOOTSTRAP_ADMIN_CPF,
  FICTITIOUS_CPF_PREFIX,
  SEED_VOLUMES,
} from "../lib/constants.js";

const FIRST_NAMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elena",
  "Fabio",
  "Gabriela",
  "Henrique",
  "Isabela",
  "Joao",
  "Karina",
  "Lucas",
  "Mariana",
  "Nicolas",
  "Olivia",
  "Paulo",
  "Renata",
  "Samuel",
  "Tatiana",
  "Vitor",
] as const;

const LAST_NAMES = [
  "Silva",
  "Costa",
  "Mendes",
  "Alves",
  "Rocha",
  "Souza",
  "Lima",
  "Ferreira",
  "Oliveira",
  "Santos",
  "Pereira",
  "Carvalho",
  "Gomes",
  "Martins",
  "Araujo",
] as const;

export type FictitiousUserSeed = {
  userName: string;
  userRegistration: string;
  userEmail: string;
  userPhone: string;
};

export function buildFictitiousUsers(count = SEED_VOLUMES.fictitiousUsers): FictitiousUserSeed[] {
  const result: FictitiousUserSeed[] = [];

  for (let i = 1; i <= count; i++) {
    const cpf = `${FICTITIOUS_CPF_PREFIX}${String(i).padStart(2, "0")}`;
    const first = FIRST_NAMES[(i - 1) % FIRST_NAMES.length]!;
    const last = LAST_NAMES[Math.floor((i - 1) / FIRST_NAMES.length) % LAST_NAMES.length]!;
    result.push({
      userName: `${first} ${last}`,
      userRegistration: cpf,
      userEmail: `${first.toLowerCase()}.${last.toLowerCase()}.${String(i).padStart(3, "0")}@ficticio.seed.gescom`,
      userPhone: `11999${String(i).padStart(6, "0")}`,
    });
  }

  return result;
}

/** Mantem compatibilidade com os 5 usuarios originais do seed antigo. */
export const LEGACY_FICTITIOUS_USERS = buildFictitiousUsers(5);

async function ensureFictitiousUser(input: FictitiousUserSeed): Promise<string> {
  const userRegistration = normalizeCpf(input.userRegistration);
  const userEmail = normalizeEmail(input.userEmail);
  const userPhone = input.userPhone.trim();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.userRegistration, userRegistration),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const row = await createUser({
    userName: input.userName.trim(),
    userRegistration,
    userEmail,
    userPhone,
  });

  console.log(`Usuario ficticio criado (${input.userName}): ${row.id}`);
  return row.id;
}

export async function seedFictitiousUsers(
  count = SEED_VOLUMES.fictitiousUsers,
): Promise<string[]> {
  const adminCpf = normalizeCpf(BOOTSTRAP_ADMIN_CPF);
  const targets = buildFictitiousUsers(count);
  const ids: string[] = [];

  console.log(`Seed usuarios ficticios: ${String(targets.length)} registros...`);

  for (const user of targets) {
    const cpf = normalizeCpf(user.userRegistration);
    if (cpf === adminCpf) {
      continue;
    }
    ids.push(await ensureFictitiousUser(user));
  }

  console.log(`Usuarios ficticios concluidos (${String(ids.length)} ids).`);
  return ids;
}

export async function listFictitiousUserIds(
  count = SEED_VOLUMES.fictitiousUsers,
): Promise<string[]> {
  const cpfs = buildFictitiousUsers(count).map((u) =>
    normalizeCpf(u.userRegistration),
  );

  const rows = await db
    .select({ id: users.id, userRegistration: users.userRegistration })
    .from(users)
    .where(and(isNull(users.deletedAt)));

  const cpfSet = new Set(cpfs);
  return rows
    .filter((r) => cpfSet.has(r.userRegistration))
    .map((r) => r.id);
}
