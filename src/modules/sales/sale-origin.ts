export type SaleOrigin = "WEB" | "MOBILE" | "DESKTOP";

const ORIGIN_BY_CLIENT: Record<string, SaleOrigin> = {
  mobile: "MOBILE",
  desktop: "DESKTOP",
};

/** Canal de fechamento: body explícito, header X-Gescom-Client (mobile/desktop) ou WEB. */
export const resolveSaleClosingOrigin = (
  bodyOrigin: SaleOrigin | undefined,
  clientHeader: string | string[] | undefined,
): SaleOrigin => {
  if (bodyOrigin) return bodyOrigin;

  const client = Array.isArray(clientHeader) ? clientHeader[0] : clientHeader;
  if (typeof client === "string") {
    const origin = ORIGIN_BY_CLIENT[client.trim().toLowerCase()];
    if (origin) return origin;
  }

  return "WEB";
};
