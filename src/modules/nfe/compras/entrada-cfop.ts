const TROCA_PRIMEIRO_DIGITO: Record<string, string> = {
  "5": "1",
  "6": "2",
  "7": "3",
};

/** 5102 sugere 1102. CFOP que já é de entrada permanece. */
export const sugerirCfopEntrada = (cfop: string | null | undefined): string | null => {
  const codigo = cfop?.trim() ?? "";
  if (!/^\d{4}$/.test(codigo)) return null;
  const destino = TROCA_PRIMEIRO_DIGITO[codigo[0] ?? ""];
  if (!destino) return codigo;
  return `${destino}${codigo.slice(1)}`;
};
