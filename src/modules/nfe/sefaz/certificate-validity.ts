const MS_PER_DAY = 86_400_000;

/** Janela em que a leitura da config avisa que o A1 vai vencer. */
export const CERT_EXPIRY_WARNING_DAYS = 30;

export type CertificateValidityMeta = {
  expired: boolean;
  notYetValid: boolean;
  daysToExpire: number;
  expiringSoon: boolean;
  alerta: string | null;
};

const pluralDias = (days: number): string =>
  days === 1 ? "1 dia" : `${days} dias`;

export const certificateValidityMeta = (
  validUntil: Date,
  now = new Date(),
  validFrom?: Date,
): CertificateValidityMeta => {
  const expireMs = validUntil.getTime() - now.getTime();
  const daysToExpire = Math.ceil(expireMs / MS_PER_DAY);
  const expired = expireMs < 0;
  const notYetValid = Boolean(validFrom && validFrom.getTime() > now.getTime());
  const expiringSoon =
    !expired &&
    !notYetValid &&
    daysToExpire >= 0 &&
    daysToExpire <= CERT_EXPIRY_WARNING_DAYS;

  let alerta: string | null = null;
  if (expired) {
    alerta = "Certificado digital vencido.";
  } else if (notYetValid) {
    alerta = "Certificado digital ainda nao e valido.";
  } else if (daysToExpire === 0) {
    alerta = "Certificado digital vence hoje.";
  } else if (expiringSoon) {
    alerta = `Certificado digital vence em ${pluralDias(daysToExpire)}.`;
  }

  return {
    expired,
    notYetValid,
    daysToExpire,
    expiringSoon,
    alerta,
  };
};

export const certificatePeriodRejection = (
  validFrom: Date,
  validUntil: Date,
  now = new Date(),
): { path: "pfx"; message: string } | null => {
  const meta = certificateValidityMeta(validUntil, now, validFrom);
  if (meta.notYetValid) {
    return {
      path: "pfx",
      message:
        "Certificado digital ainda nao e valido. Verifique a data de inicio da validade.",
    };
  }
  if (meta.expired) {
    return {
      path: "pfx",
      message: "Certificado digital vencido. Envie um novo certificado.",
    };
  }
  return null;
};

export const normalizeCnpjDigits = (value: string): string =>
  value.replace(/\D/g, "");
