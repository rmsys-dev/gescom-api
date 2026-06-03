import { MS_PER_MINUTE } from "../time/duration.js";
import { memoryCache } from "./memory-cache.js";

export const REFERENCE_DATA_TTL_MINUTES = 15;
export const REFERENCE_DATA_TTL_MS =
  REFERENCE_DATA_TTL_MINUTES * MS_PER_MINUTE;

export const referenceCacheKeys = {
  countries: "reference:countries",
  states: (countryId?: string) => `reference:states:${countryId ?? "all"}`,
  departments: "reference:departments",
} as const;

export const invalidateReferenceCountries = (): void => {
  memoryCache.delete(referenceCacheKeys.countries);
};

export const invalidateReferenceStates = (): void => {
  memoryCache.deleteByPrefix("reference:states:");
};

export const invalidateReferenceDepartments = (): void => {
  memoryCache.delete(referenceCacheKeys.departments);
};
