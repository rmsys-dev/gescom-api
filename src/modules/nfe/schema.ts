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

const onlyDigits = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""));

export const consultaCadastroQuerySchema = z
  .object({
    uf: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(UF_SIGLAS)),
    cnpj: onlyDigits
      .pipe(z.string().length(14, "CNPJ deve ter 14 digitos"))
      .optional(),
    cpf: onlyDigits
      .pipe(z.string().length(11, "CPF deve ter 11 digitos"))
      .optional(),
    ie: onlyDigits
      .pipe(z.string().min(2, "IE invalida").max(14, "IE invalida"))
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const informed = [value.cnpj, value.cpf, value.ie].filter(
      (item) => item !== undefined,
    );
    if (informed.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cnpj"],
        message: "Informe apenas um documento: cnpj, cpf ou ie",
      });
    }
  });

export type ConsultaCadastroQuery = z.infer<typeof consultaCadastroQuerySchema>;
