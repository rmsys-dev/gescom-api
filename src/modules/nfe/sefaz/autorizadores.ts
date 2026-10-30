import type { Autorizador, NfeModelo } from "./types.js";
import type { UfSigla } from "./uf.js";

const NFE_AUTORIZADOR_BY_UF: Record<UfSigla, Autorizador> = { // NFE_AUTORIZADOR_BY_UF é um objeto que mapeia a UF para o autorizador da NFE
  AM: "AM",
  BA: "BA",
  CE: "CE",
  GO: "GO",
  MG: "MG",
  MS: "MS",
  MT: "MT",
  PE: "PE",
  PR: "PR",
  RS: "RS",
  SP: "SP",
  MA: "SVAN",
  AC: "SVRS",
  AL: "SVRS",
  AP: "SVRS",
  DF: "SVRS",
  ES: "SVRS",
  PA: "SVRS",
  PB: "SVRS",
  PI: "SVRS",
  RJ: "SVRS",
  RN: "SVRS",
  RO: "SVRS",
  RR: "SVRS",
  SC: "SVRS",
  SE: "SVRS",
  TO: "SVRS",
};

const NFCE_OWN_AUTORIZADOR: Partial<Record<UfSigla, Autorizador>> = { // NFCE_OWN_AUTORIZADOR é um objeto que mapeia a UF para o autorizador da NFCE
  AM: "AM", 
  GO: "GO",
  MS: "MS",
  PR: "PR",
  RS: "RS",
  SP: "SP",
  MG: "MG",
};

export const resolveAutorizador = (  // resolveAutorizador é uma função que resolve o autorizador de acordo com a UF e o modelo da NFE
  uf: UfSigla,
  modelo: NfeModelo,
): Autorizador => {
  if (modelo === "65") {
    return NFCE_OWN_AUTORIZADOR[uf] ?? "SVRS";
  }

  return NFE_AUTORIZADOR_BY_UF[uf];
};
