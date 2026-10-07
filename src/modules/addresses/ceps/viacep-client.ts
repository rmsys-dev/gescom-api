import {
  BadGatewayError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";

const VIACEP_BASE_URL = "https://viacep.com.br/ws";
const VIACEP_TIMEOUT_MS = 5000;

export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade?: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado?: string;
  regiao?: string;
  ibge: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
};

type ViaCepRawResponse = Partial<ViaCepResponse> & { erro?: boolean | string };

export async function fetchViaCep(cepNumber: string): Promise<ViaCepResponse> {
  let response: Response;
  try {
    response = await fetch(`${VIACEP_BASE_URL}/${cepNumber}/json/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS),
    });
  } catch {
    throw new BadGatewayError(
      "Servico ViaCEP indisponivel",
      "VIACEP_UNAVAILABLE",
    );
  }

  if (!response.ok) {
    throw new BadGatewayError(
      `Servico ViaCEP respondeu com status ${response.status}`,
      "VIACEP_UNAVAILABLE",
    );
  }

  let body: ViaCepRawResponse;
  try {
    body = (await response.json()) as ViaCepRawResponse;
  } catch {
    throw new BadGatewayError(
      "Resposta invalida do servico ViaCEP",
      "VIACEP_UNAVAILABLE",
    );
  }

  if (body.erro === true || body.erro === "true" || !body.cep) {
    throw new NotFoundError(
      "CEP nao encontrado no ViaCEP",
      "CEP_NOT_FOUND_VIACEP",
    );
  }

  return body as ViaCepResponse;
}
