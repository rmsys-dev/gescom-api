/** Diferença máxima de arredondamento: R$ 0,01 por item, até R$ 0,10 no campo. */
export const CENTAVOS_POR_ITEM = 1;
export const CENTAVOS_MAXIMO_CAMPO = 10;

export type ConferenciaItem = {
  nItem: number;
  centavos: number;
};

export type ConferenciaCampo = {
  campo: string;
  totalCentavos: number;
  itens: ConferenciaItem[];
};

export type AjusteCentavo = {
  campo: string;
  nItem: number;
  centavos: number;
};

export type BloqueioConferencia = {
  campo: string;
  somaCentavos: number;
  totalCentavos: number;
};

export type ConferenciaCampoResultado = {
  ajuste: AjusteCentavo | null;
  bloqueio: BloqueioConferencia | null;
};

export const paraCentavos = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
};

export const deCentavos = (centavos: number): string => {
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const whole = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
};

/**
 * A soma gravada fica igual ao total. Sobra dentro do limite vai para o último
 * item participante. Acima do limite, o campo bloqueia o lançamento.
 */
export const conferirCampo = (
  campo: ConferenciaCampo,
): ConferenciaCampoResultado => {
  const soma = campo.itens.reduce((total, item) => total + item.centavos, 0);
  const diferenca = campo.totalCentavos - soma;
  if (diferenca === 0) {
    return { ajuste: null, bloqueio: null };
  }
  const limite = Math.min(
    CENTAVOS_MAXIMO_CAMPO,
    Math.max(campo.itens.length, 1) * CENTAVOS_POR_ITEM,
  );
  const ultimo = campo.itens.at(-1);
  if (!ultimo || Math.abs(diferenca) > limite) {
    return {
      ajuste: null,
      bloqueio: {
        campo: campo.campo,
        somaCentavos: soma,
        totalCentavos: campo.totalCentavos,
      },
    };
  }
  return {
    ajuste: {
      campo: campo.campo,
      nItem: ultimo.nItem,
      centavos: diferenca,
    },
    bloqueio: null,
  };
};
