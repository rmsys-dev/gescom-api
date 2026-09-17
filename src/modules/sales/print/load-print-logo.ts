import { eq } from "drizzle-orm";
import { db, enterprisesLogos } from "../../../db/schema.js";

/** Carrega a logo da empresa como data URI para o HTML de impressão. */
export const loadPrintLogoSrc = async (
  enterpriseId: string,
): Promise<string | null> => {
  const [row] = await db
    .select({
      bytes: enterprisesLogos.bytes,
      mime: enterprisesLogos.mime,
    })
    .from(enterprisesLogos)
    .where(eq(enterprisesLogos.enterpriseId, enterpriseId))
    .limit(1);

  if (!row?.bytes?.length) return null;
  return `data:${row.mime};base64,${row.bytes.toString("base64")}`;
};
