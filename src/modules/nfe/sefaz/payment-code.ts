const PAYMENT_CODES: Array<[RegExp, string]> = [
  [/\bpix\b/, "17"],
  [/debito/, "04"],
  [/credito|cartao/, "03"],
  [/dinheiro/, "01"],
  [/cheque/, "02"],
  [/crediario|a prazo|loja/, "05"],
  [/aliment/, "10"],
  [/refei/, "11"],
  [/presente/, "12"],
  [/combust/, "13"],
  [/boleto/, "15"],
  [/deposit/, "16"],
  [/transfer/, "18"],
  [/fidel/, "19"],
  [/sem pagamento/, "90"],
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Código tPag da NF-e a partir da descrição da forma de pagamento. */
export const sefazPaymentCode = (
  description: string | null | undefined,
): { tPag: string; xPag?: string } => {
  const text = normalize(description ?? "");
  for (const [pattern, code] of PAYMENT_CODES) {
    if (pattern.test(text)) return { tPag: code };
  }
  const xPag = (description ?? "").trim().slice(0, 60) || "Outros";
  return { tPag: "99", xPag };
};
