export type SaleOrigin = "WEB" | "MOBILE";

const GESCOM_CLIENT_MOBILE = "mobile";

/** Canal de fechamento: body explícito, header X-Gescom-Client ou WEB. */
export const resolveSaleClosingOrigin = (
  bodyOrigin: SaleOrigin | undefined,
  clientHeader: string | string[] | undefined,
): SaleOrigin => {
  if (bodyOrigin) return bodyOrigin;

  const client = Array.isArray(clientHeader) ? clientHeader[0] : clientHeader;
  if (
    typeof client === "string" &&
    client.toLowerCase() === GESCOM_CLIENT_MOBILE
  ) {
    return "MOBILE";
  }

  return "WEB";
};
