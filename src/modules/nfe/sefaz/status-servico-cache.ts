import { memoryCache } from "../../../shared/cache/memory-cache.js";
import { MS_PER_MINUTE } from "../../../shared/time/duration.js";
import type { StatusServicoResponse } from "./xml.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";

export const STATUS_SERVICO_CACHE_TTL_MS = 3 * MS_PER_MINUTE;

export const statusServicoCacheKey = (input: {
  enterpriseId: string;
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
}): string =>
  `nfe:status-servico:${input.enterpriseId}:${input.ambiente}:${input.uf}:${input.modelo}`;

export const readStatusServicoCache = (
  key: string,
): StatusServicoResponse | undefined =>
  memoryCache.get<StatusServicoResponse>(key);

export const writeStatusServicoCache = (
  key: string,
  payload: StatusServicoResponse,
): void => {
  memoryCache.set(key, payload, STATUS_SERVICO_CACHE_TTL_MS);
};
