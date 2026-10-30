import {
  conferirCampo,
  deCentavos,
  paraCentavos,
  type AjusteCentavo,
  type BloqueioConferencia,
} from "./conferencia.js";
import type { EntradaItemXml, EntradaTotais } from "./entrada-xml.js";

export type ConferenciaEntrada = {
  itens: EntradaItemXml[];
  ajustes: AjusteCentavo[];
  bloqueios: BloqueioConferencia[];
};

type CampoEntrada = {
  campo: string;
  total: (totais: EntradaTotais) => string | null;
  ler: (item: EntradaItemXml) => string | null;
  gravar: (item: EntradaItemXml, valor: string) => void;
  participa: (item: EntradaItemXml) => boolean;
};

const somaProduto = (item: EntradaItemXml): boolean => item.indTot !== "0";
const sempre = (): boolean => true;

const campos: CampoEntrada[] = [
  {
    campo: "vProd",
    total: (totais) => totais.vProd,
    ler: (item) => item.vProd,
    gravar: (item, valor) => {
      item.vProd = valor;
    },
    participa: somaProduto,
  },
  {
    campo: "vFrete",
    total: (totais) => totais.vFrete,
    ler: (item) => item.vFrete,
    gravar: (item, valor) => {
      item.vFrete = valor;
    },
    participa: sempre,
  },
  {
    campo: "vSeg",
    total: (totais) => totais.vSeg,
    ler: (item) => item.vSeg,
    gravar: (item, valor) => {
      item.vSeg = valor;
    },
    participa: sempre,
  },
  {
    campo: "vDesc",
    total: (totais) => totais.vDesc,
    ler: (item) => item.vDesc,
    gravar: (item, valor) => {
      item.vDesc = valor;
    },
    participa: sempre,
  },
  {
    campo: "vOutro",
    total: (totais) => totais.vOutro,
    ler: (item) => item.vOutro,
    gravar: (item, valor) => {
      item.vOutro = valor;
    },
    participa: sempre,
  },
  {
    campo: "vBC",
    total: (totais) => totais.vBc,
    ler: (item) => item.imposto.icmsVBc,
    gravar: (item, valor) => {
      item.imposto.icmsVBc = valor;
    },
    participa: sempre,
  },
  {
    campo: "vICMS",
    total: (totais) => totais.vIcms,
    ler: (item) => item.imposto.icmsVIcms,
    gravar: (item, valor) => {
      item.imposto.icmsVIcms = valor;
    },
    participa: sempre,
  },
  {
    campo: "vICMSDeson",
    total: (totais) => totais.vIcmsDeson,
    ler: (item) => item.imposto.icmsVIcmsDeson,
    gravar: (item, valor) => {
      item.imposto.icmsVIcmsDeson = valor;
    },
    participa: sempre,
  },
  {
    campo: "vFCP",
    total: (totais) => totais.vFcp,
    ler: (item) => item.imposto.icmsVFcp,
    gravar: (item, valor) => {
      item.imposto.icmsVFcp = valor;
    },
    participa: sempre,
  },
  {
    campo: "vBCST",
    total: (totais) => totais.vBcSt,
    ler: (item) => item.imposto.icmsVBcSt,
    gravar: (item, valor) => {
      item.imposto.icmsVBcSt = valor;
    },
    participa: sempre,
  },
  {
    campo: "vST",
    total: (totais) => totais.vSt,
    ler: (item) => item.imposto.icmsVIcmsSt,
    gravar: (item, valor) => {
      item.imposto.icmsVIcmsSt = valor;
    },
    participa: sempre,
  },
  {
    campo: "vFCPST",
    total: (totais) => totais.vFcpSt,
    ler: (item) => item.imposto.icmsVFcpSt,
    gravar: (item, valor) => {
      item.imposto.icmsVFcpSt = valor;
    },
    participa: sempre,
  },
  {
    campo: "vFCPSTRet",
    total: (totais) => totais.vFcpStRet,
    ler: (item) => item.imposto.icmsVFcpStRet,
    gravar: (item, valor) => {
      item.imposto.icmsVFcpStRet = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIPI",
    total: (totais) => totais.vIpi,
    ler: (item) => item.imposto.ipiVIpi,
    gravar: (item, valor) => {
      item.imposto.ipiVIpi = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIPIDevol",
    total: (totais) => totais.vIpiDevol,
    ler: (item) => item.imposto.vIpiDevol,
    gravar: (item, valor) => {
      item.imposto.vIpiDevol = valor;
    },
    participa: sempre,
  },
  {
    campo: "vII",
    total: (totais) => totais.vIi,
    ler: (item) => item.imposto.iiVIi,
    gravar: (item, valor) => {
      item.imposto.iiVIi = valor;
    },
    participa: sempre,
  },
  {
    campo: "vPIS",
    total: (totais) => totais.vPis,
    ler: (item) => item.imposto.pisVPis,
    gravar: (item, valor) => {
      item.imposto.pisVPis = valor;
    },
    participa: sempre,
  },
  {
    campo: "vCOFINS",
    total: (totais) => totais.vCofins,
    ler: (item) => item.imposto.cofinsVCofins,
    gravar: (item, valor) => {
      item.imposto.cofinsVCofins = valor;
    },
    participa: sempre,
  },
  {
    campo: "vTotTrib",
    total: (totais) => totais.vTotTrib,
    ler: (item) => item.imposto.vTotTrib,
    gravar: (item, valor) => {
      item.imposto.vTotTrib = valor;
    },
    participa: sempre,
  },
  {
    campo: "vBCIBSCBS",
    total: (totais) => totais.vBcIbsCbs,
    ler: (item) => item.imposto.ibsCbsVBc,
    gravar: (item, valor) => {
      item.imposto.ibsCbsVBc = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIBSUF",
    total: (totais) => totais.vIbsUf,
    ler: (item) => item.imposto.ibsUfVIbs,
    gravar: (item, valor) => {
      item.imposto.ibsUfVIbs = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIBSMun",
    total: (totais) => totais.vIbsMun,
    ler: (item) => item.imposto.ibsMunVIbs,
    gravar: (item, valor) => {
      item.imposto.ibsMunVIbs = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIBS",
    total: (totais) => totais.vIbs,
    ler: (item) => item.imposto.ibsVIbs,
    gravar: (item, valor) => {
      item.imposto.ibsVIbs = valor;
    },
    participa: sempre,
  },
  {
    campo: "vCBS",
    total: (totais) => totais.vCbs,
    ler: (item) => item.imposto.cbsVCbs,
    gravar: (item, valor) => {
      item.imposto.cbsVCbs = valor;
    },
    participa: sempre,
  },
  {
    campo: "vIS",
    total: (totais) => totais.vIs,
    ler: (item) => item.imposto.isVIs,
    gravar: (item, valor) => {
      item.imposto.isVIs = valor;
    },
    participa: sempre,
  },
];

const CAMPOS_RATEIO = new Set(["vFrete", "vSeg", "vDesc", "vOutro"]);

const copiarItem = (item: EntradaItemXml): EntradaItemXml => ({
  ...item,
  imposto: { ...item.imposto },
});

const ratearSeSoNoTotal = (
  campo: CampoEntrada,
  itens: EntradaItemXml[],
  totais: EntradaTotais,
  ajustes: AjusteCentavo[],
  bloqueios: BloqueioConferencia[],
): boolean => {
  if (!CAMPOS_RATEIO.has(campo.campo)) return false;
  const totalCentavos = paraCentavos(campo.total(totais));
  if (totalCentavos <= 0) return false;
  const soma = itens
    .filter(campo.participa)
    .reduce((acc, item) => acc + paraCentavos(campo.ler(item)), 0);
  if (soma !== 0) return false;
  const base = itens.filter(somaProduto);
  const pesos = base.map((item) => paraCentavos(item.vProd));
  const somaPesos = pesos.reduce((acc, peso) => acc + peso, 0);
  if (somaPesos <= 0) {
    bloqueios.push({
      campo: campo.campo,
      somaCentavos: 0,
      totalCentavos,
    });
    return true;
  }
  let usado = 0;
  base.forEach((item, index) => {
    const share =
      index === base.length - 1
        ? totalCentavos - usado
        : Math.floor((totalCentavos * (pesos[index] ?? 0)) / somaPesos);
    usado += share;
    campo.gravar(item, deCentavos(share));
    if (share !== 0) {
      ajustes.push({ campo: campo.campo, nItem: item.nItem, centavos: share });
    }
  });
  return false;
};

/** Soma o desonerado só dos itens com indDeduzDeson = 1. Sem indicador, devolve null. */
const desoneradoExplicito = (itens: EntradaItemXml[]): number | null => {
  const informou = itens.some((item) => {
    const indicador = item.imposto.icmsIndDeduzDeson;
    return indicador === "0" || indicador === "1";
  });
  if (!informou) return null;
  return itens.reduce((acc, item) => {
    if (item.imposto.icmsIndDeduzDeson !== "1") return acc;
    return acc + paraCentavos(item.imposto.icmsVIcmsDeson);
  }, 0);
};

const baseDaNota = (totais: EntradaTotais): number =>
  paraCentavos(totais.vProd) -
  paraCentavos(totais.vDesc) +
  paraCentavos(totais.vSt) +
  paraCentavos(totais.vFcpSt) +
  paraCentavos(totais.vFrete) +
  paraCentavos(totais.vSeg) +
  paraCentavos(totais.vOutro) +
  paraCentavos(totais.vIi) +
  paraCentavos(totais.vIpi) +
  paraCentavos(totais.vIpiDevol) +
  paraCentavos(totais.issqnVServ);

/**
 * O desonerado só sai do vNF quando o item manda deduzir.
 * Sem o indicador, usa a conta que fecha com o vNF da nota.
 */
const vNfEsperado = (itens: EntradaItemXml[], totais: EntradaTotais): number => {
  const base = baseDaNota(totais);
  const explicito = desoneradoExplicito(itens);
  if (explicito !== null) return base - explicito;
  const cheio = paraCentavos(totais.vIcmsDeson);
  const oficial = totais.vNf == null ? null : paraCentavos(totais.vNf);
  if (oficial === null || cheio === 0) return base - cheio;
  const semDeducao = base;
  const comDeducao = base - cheio;
  return Math.abs(oficial - semDeducao) <= Math.abs(oficial - comDeducao)
    ? semDeducao
    : comDeducao;
};

export const conferirEntrada = (
  origem: EntradaItemXml[],
  totais: EntradaTotais,
): ConferenciaEntrada => {
  const itens = origem.map(copiarItem);
  const ajustes: AjusteCentavo[] = [];
  const bloqueios: BloqueioConferencia[] = [];
  const pulados = new Set<string>();

  for (const campo of campos) {
    if (ratearSeSoNoTotal(campo, itens, totais, ajustes, bloqueios)) {
      pulados.add(campo.campo);
    }
  }

  for (const campo of campos) {
    if (pulados.has(campo.campo)) continue;
    const total = campo.total(totais);
    const participantes = itens.filter(campo.participa);
    const soma = participantes.reduce(
      (acc, item) => acc + paraCentavos(campo.ler(item)),
      0,
    );
    if (total === null && soma === 0) continue;
    const resultado = conferirCampo({
      campo: campo.campo,
      totalCentavos: paraCentavos(total),
      itens: participantes.map((item) => ({
        nItem: item.nItem,
        centavos: paraCentavos(campo.ler(item)),
      })),
    });
    if (resultado.bloqueio) {
      bloqueios.push(resultado.bloqueio);
      continue;
    }
    if (!resultado.ajuste) continue;
    const item = itens.find((row) => row.nItem === resultado.ajuste?.nItem);
    if (!item) continue;
    const atual = paraCentavos(campo.ler(item)) + resultado.ajuste.centavos;
    campo.gravar(item, deCentavos(atual));
    ajustes.push(resultado.ajuste);
  }

  if (totais.vNf !== null) {
    const esperado = vNfEsperado(itens, totais);
    const oficial = paraCentavos(totais.vNf);
    const diferenca = oficial - esperado;
    const limite = Math.min(10, Math.max(itens.length, 1));
    if (diferenca !== 0 && Math.abs(diferenca) > limite) {
      bloqueios.push({
        campo: "vNF",
        somaCentavos: esperado,
        totalCentavos: oficial,
      });
    }
  }

  return { itens, ajustes, bloqueios };
};

export const mensagemBloqueio = (bloqueio: BloqueioConferencia): string =>
  `Campo ${bloqueio.campo}: soma dos itens ${deCentavos(bloqueio.somaCentavos)}, total da nota ${deCentavos(bloqueio.totalCentavos)}`;
