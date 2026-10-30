import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { ceps, cities, countries, enterprises, enterprisesAddress, states } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { requireStateRegistration } from "../../../shared/validation/state-registration.js";

export async function assertActiveCep(cepId: string): Promise<void> {
  const rows = await db
    .select({
      cepId: ceps.id,
      cityDeletedAt: cities.deletedAt,
      stateDeletedAt: states.deletedAt,
      countryDeletedAt: countries.deletedAt,
    })
    .from(ceps)
    .innerJoin(cities, eq(ceps.cityId, cities.id))
    .innerJoin(states, eq(cities.stateId, states.id))
    .innerJoin(countries, eq(states.countryId, countries.id))
    .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
  }

  if (
    row.cityDeletedAt !== null ||
    row.stateDeletedAt !== null ||
    row.countryDeletedAt !== null
  ) {
    throw new NotFoundError(
      "Referencia de endereco inativa",
      "ADDRESS_REFERENCE_NOT_FOUND",
    );
  }
}

export async function ufFromCepId(cepId: string): Promise<string> {
  const rows = await db
    .select({ acronym: states.acronym })
    .from(ceps)
    .innerJoin(cities, eq(ceps.cityId, cities.id))
    .innerJoin(states, eq(cities.stateId, states.id))
    .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt), isNull(states.deletedAt)))
    .limit(1);

  const acronym = rows[0]?.acronym?.trim().toUpperCase();
  if (!acronym) {
    throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
  }
  return acronym;
}

export async function enterpriseAddressUf(enterpriseId: string): Promise<string | null> {
  const rows = await db
    .select({
      acronym: states.acronym,
      adressType: enterprisesAddress.adressType,
    })
    .from(enterprisesAddress)
    .innerJoin(ceps, eq(enterprisesAddress.cepId, ceps.id))
    .innerJoin(cities, eq(ceps.cityId, cities.id))
    .innerJoin(states, eq(cities.stateId, states.id))
    .where(
      and(
        eq(enterprisesAddress.enterpriseId, enterpriseId),
        isNull(enterprisesAddress.deletedAt),
        isNull(ceps.deletedAt),
        isNull(states.deletedAt),
      ),
    )
    .orderBy(asc(enterprisesAddress.adressType), asc(enterprisesAddress.id));

  const principal = rows.find((row) => row.adressType === "PRINCIPAL") ?? rows[0];
  return principal?.acronym?.trim().toUpperCase() ?? null;
}

export async function assertEnterpriseRegistrationForUf(
  enterpriseId: string,
  uf: string,
): Promise<void> {
  const rows = await db
    .select({ stateRegistration: enterprises.stateRegistration })
    .from(enterprises)
    .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
    .limit(1);

  const stateRegistration = rows[0]?.stateRegistration;
  if (!stateRegistration) {
    return;
  }
  requireStateRegistration(uf, stateRegistration);
}
