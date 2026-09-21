import https from "node:https";
import axios, { isAxiosError } from "axios";
import { AppError } from "../../../shared/errors/app-error.js";
import type { LoadedClientCert } from "./certificate.js";
import {
  nfeCertInvalidError,
  sefazTimeoutError,
  sefazUnavailableError,
} from "./errors.js";

type SoapPostInput = {
  url: string;
  envelope: string;
  soapAction: string;
  certificate: LoadedClientCert;
  timeoutMs: number;
};

const isTimeoutError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  return (
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ERR_CANCELED"
  );
};

const isCertificateError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("pfx") ||
    message.includes("pkcs") ||
    message.includes("mac verify failure") ||
    message.includes("unsupported") ||
    message.includes("passphrase") ||
    message.includes("password")
  );
};

export const postSefazSoap = async (input: SoapPostInput): Promise<string> => {
  const agent = new https.Agent({
    cert: input.certificate.cert,
    key: input.certificate.key,
    rejectUnauthorized: true,
  });

  try {
    const response = await axios.post<string>(input.url, input.envelope, {
      httpsAgent: agent,
      timeout: input.timeoutMs,
      responseType: "text",
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${input.soapAction}"`,
        SOAPAction: input.soapAction,
      },
      validateStatus: () => true,
    });

    if (typeof response.data !== "string" || response.data.trim() === "") {
      throw sefazUnavailableError(
        `SEFAZ retornou resposta vazia (HTTP ${response.status})`,
      );
    }

    return response.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isTimeoutError(error)) {
      throw sefazTimeoutError();
    }

    if (isCertificateError(error)) {
      throw nfeCertInvalidError(
        "Falha ao autenticar com o certificado digital na SEFAZ",
      );
    }

    if (isAxiosError(error)) {
      throw sefazUnavailableError(
        error.message || "Falha de comunicacao com a SEFAZ",
      );
    }

    throw error;
  }
};
