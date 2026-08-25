import http from "k6/http";
import { fail } from "k6";

export const K6_USER_AGENT = "gescom-k6-latency/1.0";

const LOGIN_PATH = "/api/v1/auth/login";

/**
 * Resolve o access token uma única vez (setup).
 * Prioridade: TOKEN > LOGIN/PASSWORD.
 * Login único evita rate-limit de auth e revogação de sessão entre VUs.
 */
export function resolveAccessToken(baseUrl, timeout) {
  const token = (__ENV.TOKEN || "").trim();
  if (token) {
    return token;
  }

  const login = (__ENV.LOGIN || "").trim();
  const password = __ENV.PASSWORD || "";
  const loginType = (__ENV.LOGIN_TYPE || "EMAIL").trim();

  if (!login || !password) {
    return null;
  }

  if (loginType !== "EMAIL" && loginType !== "CPF/CNPJ") {
    fail(`LOGIN_TYPE inválido: ${loginType}. Use EMAIL ou CPF/CNPJ.`);
  }

  const response = http.post(
    `${baseUrl}${LOGIN_PATH}`,
    JSON.stringify({
      loginType,
      login,
      password,
    }),
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": K6_USER_AGENT,
      },
      tags: {
        name: "auth_login",
        endpoint: LOGIN_PATH,
      },
      timeout,
    },
  );

  if (response.status !== 200) {
    fail(
      `Login falhou (HTTP ${response.status}): ${String(response.body).slice(0, 500)}`,
    );
  }

  let payload;
  try {
    payload = response.json();
  } catch {
    fail(`Login retornou corpo inválido: ${String(response.body).slice(0, 500)}`);
  }

  const accessToken = payload?.data?.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    fail("Login sem data.accessToken na resposta.");
  }

  return accessToken;
}

export function requireAccessToken(baseUrl, timeout, authRequired) {
  const token = resolveAccessToken(baseUrl, timeout);

  if (authRequired && !token) {
    fail(
      "Rota protegida: informe -e TOKEN=... ou -e LOGIN=... -e PASSWORD=... [-e LOGIN_TYPE=EMAIL|CPF/CNPJ]",
    );
  }

  return token;
}

export function buildHeaders(token, contentType) {
  const headers = {
    Accept: "application/json",
    "User-Agent": K6_USER_AGENT,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}
