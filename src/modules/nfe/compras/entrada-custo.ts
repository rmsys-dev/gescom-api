import { deCentavos, paraCentavos } from "./conferencia.js";

export type CustoEntradaItem = {
  vProd: string | null;
  vDesc: string | null;
  vFrete: string | null;
  vSeg: string | null;
  vOutro: string | null;
  vIpi: string | null;
  vIcmsSt: string | null;
  qCom: string | null;
};

export type ItemFreteEntrada = {
  nItem: number;
  vProd: string | null;
  indTot: string | null;
};

/** Rateia o frete digitado pelo vProd dos itens que entram no total. O último fica com o centavo. */
export const parcelasFreteEntrada = (
  itens: ItemFreteEntrada[],
  freteCentavos: number,
): Map<number, number> | null => {
  const mapa = new Map<number, number>();
  if (freteCentavos <= 0) return mapa;
  const base = itens.filter((item) => item.indTot !== "0");
  const pesos = base.map((item) => paraCentavos(item.vProd));
  const soma = pesos.reduce((acc, peso) => acc + peso, 0);
  if (soma <= 0) return null;
  let usado = 0;
  base.forEach((item, index) => {
    const parcela =
      index === base.length - 1
        ? freteCentavos - usado
        : Math.floor((freteCentavos * (pesos[index] ?? 0)) / soma);
    usado += parcela;
    mapa.set(item.nItem, parcela);
  });
  return mapa;
};

/** (produto − desconto + frete + seguro + outras + IPI + ICMS ST) / quantidade. */
export const custoUnitarioEntrada = (item: CustoEntradaItem): string | null => {
  const quantidade = Number(item.qCom);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
  const centavos =
    paraCentavos(item.vProd) -
    paraCentavos(item.vDesc) +
    paraCentavos(item.vFrete) +
    paraCentavos(item.vSeg) +
    paraCentavos(item.vOutro) +
    paraCentavos(item.vIpi) +
    paraCentavos(item.vIcmsSt);
  return (centavos / 100 / quantidade).toFixed(4);
};

/** Custo do XML mais a parcela do frete de despacho e redespacho. */
export const custoUnitarioComFrete = (
  item: CustoEntradaItem,
  freteCentavos: number,
): string | null => {
  const quantidade = Number(item.qCom);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
  const centavos =
    paraCentavos(item.vProd) -
    paraCentavos(item.vDesc) +
    paraCentavos(item.vFrete) +
    paraCentavos(item.vSeg) +
    paraCentavos(item.vOutro) +
    paraCentavos(item.vIpi) +
    paraCentavos(item.vIcmsSt) +
    freteCentavos;
  if (centavos < 0) return null;
  return (centavos / 100 / quantidade).toFixed(4);
};

export const custoMedioPonderado = (input: {
  saldo: number;
  custoMedioAtual: number | null;
  quantidade: number;
  custoUnitario: number;
}): string => {
  if (input.saldo <= 0 || input.custoMedioAtual === null) {
    return input.custoUnitario.toFixed(4);
  }
  const proximo =
    (input.saldo * input.custoMedioAtual +
      input.quantidade * input.custoUnitario) /
    (input.saldo + input.quantidade);
  return proximo.toFixed(4);
};

/** Margem do grupo em percentual (30 = 30%). Sem margem, não sugere preço. */
export const precoVendaSugerido = (
  custoUnitario: number,
  margemPercentual: number | null,
): string | null => {
  if (margemPercentual === null || !Number.isFinite(margemPercentual)) {
    return null;
  }
  const preco = custoUnitario * (1 + margemPercentual / 100);
  return deCentavos(paraCentavos(preco));
};
