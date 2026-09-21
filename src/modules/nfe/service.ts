import { consultarStatusServico } from "./sefaz/status-servico.js";
import {
  readStatusServicoCache,
  statusServicoCacheKey,
  writeStatusServicoCache,
} from "./sefaz/status-servico-cache.js";
import type { StatusServicoQuery } from "./schema.js";
import { nfeConfiguracaoService } from "./configuracao/service.js";

export class NfeService {
  public consultarStatusServico = async (
    query: StatusServicoQuery,
    enterpriseId: string,
  ) => {
    const ambiente =
      await nfeConfiguracaoService.getAmbiente(enterpriseId);
    const cacheKey = statusServicoCacheKey({
      enterpriseId,
      uf: query.uf,
      modelo: query.modelo,
      ambiente,
    });
    const cached = readStatusServicoCache(cacheKey);
    if (cached) {
      return cached;
    }

    const credentials =
      await nfeConfiguracaoService.loadCredentials(enterpriseId);
    const payload = await consultarStatusServico({
      uf: query.uf,
      modelo: query.modelo,
      ambiente: credentials.ambiente,
      certificate: credentials.certificate,
    });
    writeStatusServicoCache(cacheKey, payload);
    return payload;
  };
}

export const nfeService = new NfeService();
