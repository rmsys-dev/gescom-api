import { z } from "zod";
import { NFE_MODELOS } from "./sefaz/types.js";
import { UF_SIGLAS } from "./sefaz/uf.js";

export const statusServicoQuerySchema = z
  .object({
    uf: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(UF_SIGLAS)),
    modelo: z.enum(NFE_MODELOS).default("55"),
  })
  .strict();

export type StatusServicoQuery = z.infer<typeof statusServicoQuerySchema>;
