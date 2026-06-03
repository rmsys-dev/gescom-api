import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { ceps, cities, countries, states } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";

export { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";

export async function requireActiveCountry(countryId: string): Promise<void> {
  const rows = await db
    .select({ id: countries.id })
    .from(countries)
    .where(and(eq(countries.id, countryId), isNull(countries.deletedAt)))
    .limit(1);
  if (!rows[0]) {
    throw new NotFoundError("Pais nao encontrado", "COUNTRY_NOT_FOUND");
  }
}

export async function requireActiveState(stateId: string): Promise<void> {
  const rows = await db
    .select({ id: states.id })
    .from(states)
    .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
    .limit(1);
  if (!rows[0]) {
    throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
  }
}

export async function requireActiveCity(cityId: string): Promise<void> {
  const rows = await db
    .select({ id: cities.id })
    .from(cities)
    .where(and(eq(cities.id, cityId), isNull(cities.deletedAt)))
    .limit(1);
  if (!rows[0]) {
    throw new NotFoundError("Cidade nao encontrada", "CITY_NOT_FOUND");
  }
}

export async function assertNoActiveStatesForCountry(
  countryId: string,
): Promise<void> {
  const rows = await db
    .select({ id: states.id })
    .from(states)
    .where(and(eq(states.countryId, countryId), isNull(states.deletedAt)))
    .limit(1);
  if (rows[0]) {
    throw new ConflictError(
      "Pais possui estados ativos",
      "COUNTRY_HAS_ACTIVE_CHILDREN",
    );
  }
}

export async function assertNoActiveCitiesForState(
  stateId: string,
): Promise<void> {
  const rows = await db
    .select({ id: cities.id })
    .from(cities)
    .where(and(eq(cities.stateId, stateId), isNull(cities.deletedAt)))
    .limit(1);
  if (rows[0]) {
    throw new ConflictError(
      "Estado possui cidades ativas",
      "STATE_HAS_ACTIVE_CHILDREN",
    );
  }
}

export async function assertNoActiveCepsForCity(cityId: string): Promise<void> {
  const rows = await db
    .select({ id: ceps.id })
    .from(ceps)
    .where(and(eq(ceps.cityId, cityId), isNull(ceps.deletedAt)))
    .limit(1);
  if (rows[0]) {
    throw new ConflictError(
      "Cidade possui CEPs ativos",
      "CITY_HAS_ACTIVE_CHILDREN",
    );
  }
}
