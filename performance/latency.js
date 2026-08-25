/**
 * Teste de latência local / desenvolvimento (K6).
 *
 * Exemplos:
 *   k6 run -e BASE_URL=http://localhost:3000 performance/latency.js
 *   k6 run -e BASE_URL=http://localhost:3000 -e ENDPOINT=/api/v1/auth/me \
 *     -e LOGIN=user@email.com -e PASSWORD=segredo -e AUTH_REQUIRED=true \
 *     performance/latency.js
 *   k6 run -e BASE_URL=http://localhost:3000 -e ENDPOINT=/api/v1/products \
 *     -e TOKEN=eyJ... -e AUTH_REQUIRED=true performance/latency.js
 *
 * Variáveis:
 *   BASE_URL       obrigatório
 *   ENDPOINT       default /health
 *   METHOD         default GET
 *   QUERY          query string opcional (ex: limit=10&offset=0)
 *   BODY           corpo para POST/PUT/PATCH
 *   TOKEN          Bearer access token (preferível)
 *   LOGIN          login (EMAIL ou CPF/CNPJ)
 *   PASSWORD       senha
 *   LOGIN_TYPE     EMAIL (default) | CPF/CNPJ
 *   AUTH_REQUIRED  true para falhar no setup sem credenciais
 *   VUS            default 1
 *   ITERATIONS     default 50
 *   SLEEP          segundos entre iterações (default 0)
 *   TIMEOUT        default 15s
 */
import { sleep } from "k6";
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
const SLEEP_SECONDS = Number(__ENV.SLEEP || 0);

export const options = {
  scenarios: {
    latency_local: {
      executor: "shared-iterations",
      vus: Number(__ENV.VUS || 1),
      iterations: Number(__ENV.ITERATIONS || 50),
      maxDuration: __ENV.MAX_DURATION || "5m",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(50)<300", "p(95)<500", "p(99)<1000"],
    checks: ["rate>0.99"],
  },

  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  // Login no setup não deve contar como falha do cenário de latência.
  setupTimeout: "30s",
};

export function setup() {
  const token = requireAccessToken(BASE_URL, TIMEOUT, isAuthRequiredFlag());

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
