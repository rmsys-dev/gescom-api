import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { ceps, cities, states } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  requireActiveCity,
  requireActiveCountry,
  requireActiveState,
} from "../../maintainer/shared/address-helpers.js";

export type AddressHierarchyInput = {
  cepId: string;
  cityId: string;
  stateId: string;
  countryId: string;
};

export async function requireActiveCep(cepId: string): Promise<void> {
  const rows = await db
    .select({ id: ceps.id })
    .from(ceps)
    .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt)))
    .limit(1);
  if (!rows[0]) {
    throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
  }
}

export async function assertAddressHierarchy(
  input: AddressHierarchyInput,
): Promise<void> {
  await Promise.all([
    requireActiveCountry(input.countryId),
    requireActiveState(input.stateId),
    requireActiveCity(input.cityId),
    requireActiveCep(input.cepId),
  ]);

  const [cepRow, cityRow, stateRow] = await Promise.all([
    db
      .select({ cityId: ceps.cityId })
      .from(ceps)
      .where(and(eq(ceps.id, input.cepId), isNull(ceps.deletedAt)))
      .limit(1),
    db
      .select({ stateId: cities.stateId })
      .from(cities)
      .where(and(eq(cities.id, input.cityId), isNull(cities.deletedAt)))
      .limit(1),
    db
      .select({ countryId: states.countryId })
      .from(states)
      .where(and(eq(states.id, input.stateId), isNull(states.deletedAt)))
      .limit(1),
  ]);

  const cep = cepRow[0];
  const city = cityRow[0];
  const state = stateRow[0];

  if (!cep || !city || !state) {
    throw new NotFoundError(
      "Referencia de endereco nao encontrada",
      "ADDRESS_REFERENCE_NOT_FOUND",
    );
  }

  if (cep.cityId !== input.cityId) {
    throw new ConflictError(
      "CEP nao pertence a cidade informada",
      "ADDRESS_HIERARCHY_MISMATCH",
    );
  }

  if (city.stateId !== input.stateId) {
    throw new ConflictError(
      "Cidade nao pertence ao estado informado",
      "ADDRESS_HIERARCHY_MISMATCH",
    );
  }

  if (state.countryId !== input.countryId) {
    throw new ConflictError(
      "Estado nao pertence ao pais informado",
      "ADDRESS_HIERARCHY_MISMATCH",
    );
  }
}
