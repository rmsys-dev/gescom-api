const checkDigit = (base43: string): string => {
  let weight = 2;
  let sum = 0;
  for (let index = base43.length - 1; index >= 0; index -= 1) {
    sum += Number(base43[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const digit = 11 - rest;
  return digit >= 10 ? "0" : String(digit);
};

export const buildNfeAccessKey = (parts: {
  cUf: string;
  yearMonth: string;
  cnpj: string;
  mod: string;
  serie: string;
  nNf: number;
  tpEmis: number;
  cNf: string;
}): string => {
  const base =
    parts.cUf +
    parts.yearMonth +
    parts.cnpj.padStart(14, "0") +
    parts.mod +
    parts.serie.padStart(3, "0") +
    String(parts.nNf).padStart(9, "0") +
    String(parts.tpEmis) +
    parts.cNf;
  return base + checkDigit(base);
};

/** Troca o nNF da chave provisória pelo número reservado na sequência. */
export const accessKeyWithInvoiceNumber = (
  chave: string,
  nNf: number,
): string => {
  const base =
    chave.slice(0, 25) + String(nNf).padStart(9, "0") + chave.slice(34, 43);
  return base + checkDigit(base);
};

/** Troca a série da chave pela série gravada na nota. */
export const accessKeyWithSerie = (chave: string, serie: string): string => {
  const base =
    chave.slice(0, 22) + serie.padStart(3, "0") + chave.slice(25, 43);
  return base + checkDigit(base);
};
