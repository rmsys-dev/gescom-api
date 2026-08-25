import http from "k6/http";
import { check, fail } from "k6";

/**
 * Normaliza BASE_URL (sem barra final) e ENDPOINT (com barra inicial).
 * Usa throw (não fail) para funcionar no estágio de init do K6.
 */
export function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) {
    throw new Error(
      "Informe a URL da API com -e BASE_URL=https://api.exemplo.com",
    );
  }
  return value;
}

export function normalizeEndpoint(raw) {
  const value = String(raw || "/health").trim();
  if (!value) {
    return "/health";
  }
  return value.startsWith("/") ? value : `/${value}`;
}

export function resolveTimeout() {
  return __ENV.TIMEOUT || "15s";
}

export function resolveMethod() {
  return String(__ENV.METHOD || "GET").trim().toUpperCase();
}

export function isAuthRequiredFlag() {
  return __ENV.AUTH_REQUIRED === "true" || __ENV.AUTH_REQUIRED === "1";
}

/** Checks de 401/403 só fazem sentido quando há token ou AUTH_REQUIRED. */
export function expectsAuth(token) {
  if (__ENV.AUTH_REQUIRED === "false" || __ENV.AUTH_REQUIRED === "0") {
    return false;
  }
  return isAuthRequiredFlag() || Boolean(token);
}

export function buildUrl(baseUrl, endpoint) {
  const query = (__ENV.QUERY || "").trim();
  if (!query) {
    return `${baseUrl}${endpoint}`;
  }
  const separator = endpoint.includes("?") ? "&" : "?";
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
  return `${baseUrl}${endpoint}${separator}${normalizedQuery}`;
}

export function executeRequest(url, method, headers, timeout, endpoint) {
  const params = {
    headers,
    tags: {
      name: endpoint,
      endpoint,
      method,
    },
    timeout,
  };

  const body = __ENV.BODY;
  const hasBody = body !== undefined && body !== null && String(body).length > 0;

  if (method === "GET" || method === "HEAD") {
    return http.request(method, url, null, params);
  }

  return http.request(method, url, hasBody ? String(body) : null, params);
}

export function assertSuccess(response, authExpected) {
  const ok = check(response, {
    "status 2xx": (r) => r.status >= 200 && r.status < 300,
    "sem erro de rede": (r) => r.status !== 0,
    ...(authExpected
      ? {
          "nao retornou 401": (r) => r.status !== 401,
          "nao retornou 403": (r) => r.status !== 403,
        }
      : {}),
  });

  if (!ok && (__ENV.FAIL_ON_CHECK === "true" || __ENV.FAIL_ON_CHECK === "1")) {
    fail(
      `Falha na requisição (HTTP ${response.status}): ${String(response.body).slice(0, 300)}`,
    );
  }

  return ok;
}
