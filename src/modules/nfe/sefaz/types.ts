export const NFE_MODELOS = ["55", "65"] as const;
export type NfeModelo = (typeof NFE_MODELOS)[number];

export const SEFAZ_AMBIENTES = [1, 2] as const;
export type SefazAmbiente = (typeof SEFAZ_AMBIENTES)[number];

export const SEFAZ_SERVICES = ["NFeStatusServico4"] as const;
export type SefazService = (typeof SEFAZ_SERVICES)[number];

export const AUTORIZADORES = [
  "AM",
  "BA",
  "CE",
  "GO",
  "MG",
  "MS",
  "MT",
  "PE",
  "PR",
  "RS",
  "SP",
  "SVAN",
  "SVRS",
] as const;
export type Autorizador = (typeof AUTORIZADORES)[number];

export const NFE_TIPOS_EMISSAO = [1, 2, 4, 5, 6, 7, 9] as const;
export type NfeTipoEmissao = (typeof NFE_TIPOS_EMISSAO)[number];
