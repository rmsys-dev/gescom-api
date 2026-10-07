import { sefazPaymentCode } from "./payment-code.js";

/** Valor numérico no estilo Harbour `val()`: "01" vale 1, texto vazio vale 0. */
export const harbourNumber = (value: string | null | undefined): number => {
  const digits = (value ?? "").trim();
  if (!/^\d+$/.test(digits)) return 0;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : 0;
};

const twoDigitCode = (value: string | null | undefined): string | undefined => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits || digits.length > 2) return undefined;
  return digits.padStart(2, "0");
};

const integrationCode = (value: string | null | undefined): string | undefined => {
  const text = (value ?? "").trim();
  return /^[012]$/.test(text) ? text : undefined;
};

export type NfePaymentCatalog = {
  paymentCode?: string | null;
  integration?: string | null;
  flagCode?: string | null;
  flagDescription?: string | null;
  paymentDescription?: string | null;
  cnpj?: string | null;
};

export type NfePaymentStored = {
  tPag?: string | null;
  xPag?: string | null;
  cardTpIntegra?: string | null;
  cardTBand?: string | null;
  cardCnpj?: string | null;
  cardCAut?: string | null;
};

export type ResolvedNfePayment = {
  tPag: string;
  xPag?: string;
  cardTpIntegra?: string;
  cardTBand?: string;
  cardCnpj?: string;
  cardCAut?: string;
};

const catalogText = (value: string | null | undefined): string | undefined => {
  const text = (value ?? "").trim();
  return text ? text : undefined;
};

/**
 * Monta os campos já existentes de nfe_payments a partir da configuração de
 * pagamento da empresa. Meio, bandeira e CNPJ vencem o que já está gravado na parcela.
 */
export const resolveNfePayment = (
  stored: NfePaymentStored,
  catalog: NfePaymentCatalog = {},
): ResolvedNfePayment => {
  const methodCode = catalogText(catalog.paymentCode)
    ? twoDigitCode(catalog.paymentCode)
    : undefined;
  const storedCode = twoDigitCode(stored.tPag);
  const tPag = methodCode ?? storedCode ?? sefazPaymentCode(catalog.paymentDescription).tPag;

  const flagName = (catalog.flagDescription ?? "").trim().slice(0, 60);
  const storedName = (stored.xPag ?? "").trim().slice(0, 60);
  const xPag = tPag === "99" ? flagName || storedName || "OUTROS" : undefined;

  const integration = catalogText(catalog.integration)
    ? integrationCode(catalog.integration)
    : integrationCode(stored.cardTpIntegra);
  const flag = catalogText(catalog.flagCode)
    ? twoDigitCode(catalog.flagCode)
    : twoDigitCode(stored.cardTBand);
  const band = flag && harbourNumber(flag) > 0 ? flag : undefined;

  const catalogCnpj = (catalog.cnpj ?? "").replace(/\D/g, "");
  const cnpj =
    catalogCnpj.length === 14
      ? catalogCnpj
      : (stored.cardCnpj ?? "").replace(/\D/g, "").slice(0, 14);
  const authorization = (stored.cardCAut ?? "").trim().slice(0, 128);

  return {
    tPag,
    ...(xPag ? { xPag } : {}),
    ...(integration ? { cardTpIntegra: integration } : {}),
    ...(band ? { cardTBand: band } : {}),
    ...(cnpj ? { cardCnpj: cnpj } : {}),
    ...(authorization ? { cardCAut: authorization } : {}),
  };
};
