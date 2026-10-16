export type BankSlipRegistration = {
  externalId?: string;
  barcode?: string;
  digitableLine?: string;
};

export type ParsedBankReturnItem = {
  nossoNumero: string;
  occurrenceCode: string;
  occurrence: "REGISTRO_CONFIRMADO" | "REGISTRO_REJEITADO" | "LIQUIDACAO" | "BAIXA";
  paidAmount?: string;
  paidAt?: string;
  creditDate?: string;
};

export type BankCollectionPort = {
  provider: string;
  register: (input: {
    nossoNumero: string;
    amount: string;
    dueDate: string;
    documentNumber: string | null;
  }) => Promise<BankSlipRegistration>;
  cancel: (nossoNumero: string) => Promise<void>;
  changeDueDate: (nossoNumero: string, dueDate: string) => Promise<void>;
  buildRemittance: (slips: Array<{
    nossoNumero: string;
    amount: string;
    dueDate: string;
    documentNumber: string | null;
    movement: "REGISTRO" | "ALTERACAO_VENCIMENTO" | "PEDIDO_BAIXA";
  }>) => Promise<string>;
  parseReturn: (content: string) => Promise<ParsedBankReturnItem[]>;
};

const ports = new Map<string, BankCollectionPort>();

export const registerBankCollectionPort = (port: BankCollectionPort): void => {
  ports.set(port.provider, port);
};

export const getBankCollectionPort = (
  provider: string | null | undefined,
): BankCollectionPort | undefined =>
  provider ? ports.get(provider) : undefined;
