import { ValidationError } from "../../shared/errors/app-error.js";

export type WholeFractional = "INTEIRO" | "FRACIONADO";

/** Unidade INTEIRO exige quantidade sem casas decimais; FRACIONADO aceita qualquer positivo. */
export function assertQuantityMatchesWholeFractional(
  quantity: number,
  wholeFractional: WholeFractional,
  pathPrefix: string,
) {
  if (wholeFractional !== "INTEIRO") return;
  if (!Number.isInteger(quantity)) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.quantity`,
          message: "Unidade exige quantidade inteira",
        },
      ],
      "Quantidade invalida",
    );
  }
}
