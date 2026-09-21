export const UF_SIGLAS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export type UfSigla = (typeof UF_SIGLAS)[number];

const UF_TO_CUF = {
  RO: "11",
  AC: "12",
  AM: "13",
  RR: "14",
  PA: "15",
  AP: "16",
  TO: "17",
  MA: "21",
  PI: "22",
  CE: "23",
  RN: "24",
  PB: "25",
  PE: "26",
  AL: "27",
  SE: "28",
  BA: "29",
  MG: "31",
  ES: "32",
  RJ: "33",
  SP: "35",
  PR: "41",
  SC: "42",
  RS: "43",
  MS: "50",
  MT: "51",
  GO: "52",
  DF: "53",
} as const satisfies Record<UfSigla, string>;

const CUF_TO_UF = Object.fromEntries(
  Object.entries(UF_TO_CUF).map(([uf, cuf]) => [cuf, uf]),
) as Record<string, UfSigla>;

export const isUfSigla = (value: string): value is UfSigla =>
  (UF_SIGLAS as readonly string[]).includes(value);

export const getCufFromUf = (uf: UfSigla): string => UF_TO_CUF[uf];

export const getUfFromCuf = (cuf: string): UfSigla | undefined =>
  CUF_TO_UF[cuf];
