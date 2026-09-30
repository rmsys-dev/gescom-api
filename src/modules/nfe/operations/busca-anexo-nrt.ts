import { BadRequestError } from "../../../shared/errors/app-error.js";

export type AnexoNrtOption = {
  id: string;
  anexo: string;
  legislation: string;
  classificationIbsCbsId: string;
  ibsCbsCst: string | null;
  pRedIbs: string | null;
  pRedCbs: string | null;
};

const anexoDetails = (anexos: AnexoNrtOption[]) =>
  anexos.map((row) => ({
    path: "anexoRtId",
    message: `${row.id} anexo ${row.anexo} ${row.legislation} classificacao ${row.classificationIbsCbsId}`,
  }));

export const buscaAnexoNRT = (
  anexos: AnexoNrtOption[],
  anexoRtId: string | undefined,
): AnexoNrtOption | null => {
  if (anexos.length === 0) return null;
  if (anexoRtId) {
    const chosen = anexos.find((row) => row.id === anexoRtId);
    if (!chosen) {
      throw new BadRequestError(
        "Anexo da reforma tributaria nao pertence ao NCM do produto",
        "NFE_ANEXO_RT_INVALID",
        anexoDetails(anexos),
      );
    }
    return chosen;
  }
  if (anexos.length === 1) return anexos[0]!;
  throw new BadRequestError(
    "Ha mais de um anexo da reforma tributaria para o NCM. Informe anexoRtId",
    "NFE_ANEXO_RT_REQUIRED",
    anexoDetails(anexos),
  );
};
