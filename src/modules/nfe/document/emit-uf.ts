import { BadRequestError } from "../../../shared/errors/app-error.js";
import { getUfFromCuf, isUfSigla, type UfSigla } from "../sefaz/uf.js";

/** UF do emitente pela sigla gravada na nota ou, na falta dela, pelo cUF da chave. */
export const resolveEmitUf = (document: {
  emitUf: string | null;
  cUf: string;
}): UfSigla => {
  const uf = (document.emitUf ?? "").toUpperCase();
  if (isUfSigla(uf)) {
    return uf;
  }
  const fromCode = getUfFromCuf(document.cUf);
  if (fromCode) {
    return fromCode;
  }
  throw new BadRequestError(
    "UF do emitente invalida para autorizar a nota",
    "NFE_EMIT_UF_INVALID",
  );
};
