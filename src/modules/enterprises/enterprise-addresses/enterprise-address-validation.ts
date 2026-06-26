import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { ceps, cities, countries, states } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";

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
