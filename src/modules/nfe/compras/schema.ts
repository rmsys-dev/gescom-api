import { z } from "zod";

export const consultarCompraChaveSchema = z
  .object({
    chave: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{44}$/, "Chave de acesso deve ter 44 digitos")),
  })
  .strict();

export type ConsultarCompraChaveInput = z.infer<typeof consultarCompraChaveSchema>;
