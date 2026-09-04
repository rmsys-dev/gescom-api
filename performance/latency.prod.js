/**
 * Teste de latência em produção (K6) — carga baixa e limiares realistas.
 *
 * Segurança:
 *   - Bloqueia BASE_URL local por padrão
 *   - Prefira TOKEN (sem criar sessão nova a cada run)
 *   - SLEEP padrão evita esgotar o rate-limit da API
 *
 * Exemplos:
 *   k6 run -e BASE_URL=https://api.exemplo.com -e ENDPOINT=/health \
 *     performance/latency.prod.js
 *   k6 run -e BASE_URL=https://api.exemplo.com \
 *     -e ENDPOINT=/api/v1/auth/me -e TOKEN=eyJ... -e AUTH_REQUIRED=true \
 *     performance/latency.prod.js
 *   k6 run -e BASE_URL=https://api.exemplo.com \
 *     -e ENDPOINT=/api/v1/products -e QUERY="limit=20&offset=0" \
 *     -e LOGIN=user@email.com -e PASSWORD=segredo -e AUTH_REQUIRED=true \
 *     -e VUS=1 -e DURATION=2m performance/latency.prod.js
 *
 * Variáveis: mesmas de latency.js +
 *   DURATION       default 2m
 *   SLEEP          default 0.5 (segundos entre iterações)
 *   ALLOW_LOCALHOST true para permitir localhost (não recomendado)
 */
import { sleep } from "k6";
import { fail } from "k6";
import { buildHeaders, requireAccessToken } from "./lib/auth.js";
import {
  assertSuccess,
  buildUrl,
  executeRequest,
  expectsAuth,
  isAuthRequiredFlag,
  normalizeBaseUrl,
  normalizeEndpoint,
  resolveMethod,
  resolveTimeout,
} from "./lib/request.js";

const BASE_URL = normalizeBaseUrl(__ENV.BASE_URL);
const ENDPOINT = normalizeEndpoint(__ENV.ENDPOINT || "/health");
const METHOD = resolveMethod();
const TIMEOUT = resolveTimeout();
const SLEEP_SECONDS = Number(__ENV.SLEEP || 0.5);

function assertProductionBaseUrl(baseUrl) {
  const allowLocal =
    __ENV.ALLOW_LOCALHOST === "true" || __ENV.ALLOW_LOCALHOST === "1";
  if (allowLocal) {
    return;
  }

  const lowered = baseUrl.toLowerCase();
  const isLocal =
    lowered.includes("localhost") ||
    lowered.includes("127.0.0.1") ||
    lowered.includes("0.0.0.0") ||
    lowered.includes("[::1]");

  if (isLocal) {
    throw new Error(
      "latency.prod.js exige BASE_URL de produção. Use performance/latency.js para local, ou -e ALLOW_LOCALHOST=true.",
    );
  }
}

assertProductionBaseUrl(BASE_URL);

export const options = {
  scenarios: {
    latency_prod: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 1),
      duration: __ENV.DURATION || "2m",
      gracefulStop: "10s",
    },
  },

  // Limiares mais folgados: RTT/rede + cold start de serverless/proxy.
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(50)<800", "p(95)<2000", "p(99)<4000"],
    checks: ["rate>0.98"],
  },

  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  setupTimeout: "45s",
  // Evita sobrecarregar produção por engano.
  noConnectionReuse: false,
};

export function setup() {
  const token = requireAccessToken(BASE_URL, TIMEOUT, isAuthRequiredFlag());

  if (Number(__ENV.VUS || 1) > 50) {
    fail(
      "VUS alto demais para produção neste script (máx. 50). Ajuste VUS ou use um perfil dedicado.",
    );
  }

  return {
    token,
    url: buildUrl(BASE_URL, ENDPOINT),
    authExpected: expectsAuth(token),
  };
}

export default function (data) {
  const contentType =
    METHOD === "GET" || METHOD === "HEAD"
      ? null
      : __ENV.CONTENT_TYPE || "application/json";

  const response = executeRequest(
    data.url,
    METHOD,
    buildHeaders(data.token, contentType),
    TIMEOUT,
    ENDPOINT,
  );

  assertSuccess(response, data.authExpected);

  if (SLEEP_SECONDS > 0) {
    sleep(SLEEP_SECONDS);
  }
}
