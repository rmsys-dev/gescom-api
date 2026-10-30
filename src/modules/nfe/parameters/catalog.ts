export const nfeParameterCatalog = [
  "portal_nfe",
  "portal_consulta_nfe",
  "versao_layout",
] as const;

export type NfeParameterSlug = (typeof nfeParameterCatalog)[number];

export const nfeParameterDefaults = {
  portal_nfe: "https://www.nfe.fazenda.gov.br/portal",
  portal_consulta_nfe:
    "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx",
  versao_layout: "4.00",
} as const satisfies Record<NfeParameterSlug, string>;

export const isNfeParameterSlug = (value: string): value is NfeParameterSlug =>
  (nfeParameterCatalog as readonly string[]).includes(value);

export const mergeNfeParameters = (
  rows: ReadonlyArray<{ parameter: string; value: string }>,
): Record<NfeParameterSlug, string> => {
  const resolved: Record<NfeParameterSlug, string> = {
    ...nfeParameterDefaults,
  };
  for (const row of rows) {
    if (isNfeParameterSlug(row.parameter)) {
      resolved[row.parameter] = row.value;
    }
  }
  return resolved;
};

export const serializeNfeParameters = (
  resolved: Partial<Record<NfeParameterSlug, string>> = {},
): Record<NfeParameterSlug, string> => {
  const serialized: Record<NfeParameterSlug, string> = {
    ...nfeParameterDefaults,
  };
  for (const slug of nfeParameterCatalog) {
    const value = resolved[slug];
    if (value !== undefined) {
      serialized[slug] = value;
    }
  }
  return serialized;
};
