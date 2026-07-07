/**
 * Gera coleções Postman v2.1 a partir dos arquivos routes.ts do projeto.
 * Uso: node postman-collections/generate-complete-collection.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "postman-collections");

const API_PREFIX = "/api/v1";
const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

/** Exemplos de body por nome de schema Zod (quando conhecido). */
const BODY_EXAMPLES = {
  loginSchema: {
    loginType: "EMAIL",
    login: "usuario@exemplo.com",
    password: "senha123",
  },
  refreshSchema: { refreshToken: "{{refreshToken}}" },
  switchEnterpriseSchema: { enterpriseId: "{{enterpriseId}}" },
  firstAccessLookupSchema: { email: "usuario@exemplo.com" },
  firstAccessVerifySchema: {
    loginType: "EMAIL",
    login: "usuario@exemplo.com",
    code: "123456",
    password: "novaSenha123",
    confirmPassword: "novaSenha123",
  },
  firstAccessResendSchema: { email: "usuario@exemplo.com" },
  passwordResetRequestSchema: { email: "usuario@exemplo.com" },
  passwordResetVerifySchema: {
    loginType: "EMAIL",
    login: "usuario@exemplo.com",
    code: "123456",
    password: "novaSenha123",
    confirmPassword: "novaSenha123",
  },
  passwordResetResendSchema: { email: "usuario@exemplo.com" },
  invitationAcceptPublicSchema: {
    loginType: "EMAIL",
    login: "usuario@exemplo.com",
    password: "senha123",
    code: "123456",
  },
  invitationDeclineSchema: { reason: "Não tenho interesse no momento" },
  createUnitSchema: { unit: "UN", description: "UNIDADE", compatible: "PC" },
  patchUnitSchema: { description: "UNIDADE ATUALIZADA" },
  createEnterpriseSchema: {
    registration: "12345678000199",
    legalName: "EMPRESA EXEMPLO LTDA",
    tradeName: "EMPRESA EXEMPLO",
    phone: "+5511999999999",
    email: "contato@exemplo.com",
  },
  patchEnterpriseSchema: { tradeName: "NOVO NOME FANTASIA" },
  createUserBodySchema: {
    userName: "João Silva",
    userRegistration: "12345678901",
    userEmail: "joao@exemplo.com",
    userPhone: "+5511988888888",
  },
  patchUserBodySchema: { userName: "João Silva Atualizado" },
  createMembershipSchema: {
    userId: "{{userId}}",
    class: "CLIENTE",
    departments: [{ departmentId: "{{departmentId}}", mainDepartment: true }],
  },
  createOnboardMembershipSchema: {
    user: {
      userName: "Maria Souza",
      userEmail: "maria@exemplo.com",
    },
    member: {
      class: "CLIENTE",
      departments: [{ departmentId: "{{departmentId}}", mainDepartment: true }],
    },
    sendEmail: true,
  },
  inviteMembershipBodySchema: {
    member: {
      class: "CLIENTE",
      departments: [{ departmentId: "{{departmentId}}", mainDepartment: true }],
    },
    inviteEmail: "convidado@exemplo.com",
    sendEmail: true,
  },
  addMemberDepartmentSchema: {
    departmentId: "{{departmentId}}",
    mainDepartment: false,
  },
  patchMemberDepartmentSchema: { mainDepartment: true },
  patchMemberDepartmentPermissionBodySchema: {
    permissions: ["consultar_vendas"],
  },
  patchMembershipSchema: { status: "ATIVO" },
  createSaleSchema: {
    memberId: "{{memberId}}",
    type: "ORCAMENTO",
    status: "ABERTA",
    items: [
      {
        quantity: 1,
        valueUnit: 100,
        valueDiscount: 0,
        valueAcresce: 0,
        productsEnterprisesId: "{{productEnterpriseId}}",
        unitId: "{{unitId}}",
        productTypeId: "{{productTypeId}}",
      },
    ],
    payments: [{ paymentTypeId: "{{paymentTypeId}}", value: 100 }],
  },
  patchSaleSchema: { status: "FINALIZADA" },
  convertBudgetToSaleSchema: {
    status: "FINALIZADA",
    items: [],
    payments: [{ paymentTypeId: "{{paymentTypeId}}", value: 100 }],
  },
  createSaleItemSchema: {
    quantity: 1,
    valueUnit: 50,
    valueDiscount: 0,
    valueAcresce: 0,
    productsEnterprisesId: "{{productEnterpriseId}}",
    unitId: "{{unitId}}",
    productTypeId: "{{productTypeId}}",
  },
  patchSaleItemSchema: { quantity: 2 },
  createPartialReturnSchema: {
    notes: "Devolução parcial",
    items: [{ saleItemId: "{{saleItemId}}", quantity: 1 }],
  },
  createFullReturnSchema: { notes: "Devolução total" },
  personalInfoCreateSchema: {
    gender: "MASCULINO",
    birthDate: "1990-01-15",
    placeOfBirth: "São Paulo",
  },
  personalInfoPatchSchema: { placeOfBirth: "Campinas" },
  usersAddressCreateSchema: {
    cepId: "{{cepId}}",
    number: "100",
    complement: "Apto 12",
    adressType: "RESIDENCIAL",
  },
  usersAddressPatchSchema: { number: "200" },
  usersContactCreateSchema: {
    contactType: "CELULAR",
    contactValue: "+5511977777777",
    isMain: true,
  },
  usersContactPatchSchema: { isMain: false },
  usersRelationshipsCreateSchema: { maritalStatus: "SOLTEIRO" },
  usersRelationshipsPatchSchema: { housingType: "PROPRIO" },
  usersTaxInfosCreateSchema: { taxpayerType: "CONTRIBUINTE" },
  usersTaxInfosPatchSchema: { stateRegistration: "123456789" },
  usersFinancialInfoCreateSchema: { creditType: "A_VISTA" },
  usersFinancialInfoPatchSchema: { creditLimit: 5000 },
};

/** Query params comuns por padrão de nome de schema. */
const QUERY_HINTS = {
  list: ["limit", "offset"],
  analyticsPeriod: [
    "periodPreset",
    "dateFrom",
    "dateTo",
    "timezone",
    "compareMode",
    "sellerId",
    "memberId",
    "paymentTypeId",
  ],
  analyticsRanking: ["limit", "periodPreset", "dateFrom", "dateTo"],
  analyticsTimeseries: ["granularity", "periodPreset", "dateFrom", "dateTo"],
  analyticsTopProducts: ["sortBy", "limit", "periodPreset", "dateFrom", "dateTo"],
  analyticsOperations: ["periodPreset", "dateFrom", "dateTo"],
  analyticsReceivables: ["periodPreset", "dateFrom", "dateTo"],
  listSales: [
    "limit",
    "offset",
    "type",
    "status",
    "budgetClosureSituation",
    "userId",
    "sellerId",
    "orderNumber",
    "seller",
    "client",
  ],
  listMembers: [
    "limit",
    "offset",
    "userId",
    "code",
    "class",
    "status",
    "postSalesStatus",
    "registration",
    "email",
    "phone",
  ],
  listUsers: ["limit", "offset", "registration", "email", "phone"],
  listProducts: ["limit", "offset", "status", "search"],
};

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function resolveImportPath(fromFile, importPath) {
  const withoutExt = importPath.replace(/\.js$/, "");
  const abs = path.resolve(path.dirname(fromFile), withoutExt);
  const candidates = [`${abs}.ts`, `${abs}/routes.ts`, `${abs}/index.ts`];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseImports(content, fromFile) {
  const imports = new Map();
  const re =
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(content))) {
    const names = match[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/).pop().trim());
    const resolved = resolveImportPath(fromFile, match[2]);
    if (!resolved) continue;
    for (const name of names) {
      if (name.endsWith("Router")) imports.set(name, resolved);
    }
  }
  return imports;
}

function extractRouteBlock(content, startIndex) {
  let depth = 0;
  let i = startIndex;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "(") depth++;
    if (ch === ")") {
      depth--;
      if (depth === 0) return content.slice(startIndex, i + 1);
    }
    i++;
  }
  return content.slice(startIndex);
}

function inferQueryParams(schemaName) {
  if (!schemaName) return [];
  const lower = schemaName.toLowerCase();
  if (lower.includes("pagination") || lower.startsWith("list")) {
    if (lower.includes("sales")) return QUERY_HINTS.listSales;
    if (lower.includes("member")) return QUERY_HINTS.listMembers;
    if (lower.includes("user")) return QUERY_HINTS.listUsers;
    if (lower.includes("product") && !lower.includes("enterprise"))
      return QUERY_HINTS.listProducts;
    return QUERY_HINTS.list;
  }
  if (lower.includes("analyticsperiod")) return QUERY_HINTS.analyticsPeriod;
  if (lower.includes("analyticsranking")) return QUERY_HINTS.analyticsRanking;
  if (lower.includes("analyticstimeseries")) return QUERY_HINTS.analyticsTimeseries;
  if (lower.includes("analyticstopproducts")) return QUERY_HINTS.analyticsTopProducts;
  if (lower.includes("analyticsoperations")) return QUERY_HINTS.analyticsOperations;
  if (lower.includes("analyticsreceivables")) return QUERY_HINTS.analyticsReceivables;
  return [];
}

function parseRouteDefinitions(content, routerVarName) {
  const routes = [];
  const methodRe = new RegExp(
    `${routerVarName}\\.(get|post|put|patch|delete)\\(`,
    "g",
  );
  let match;
  while ((match = methodRe.exec(content))) {
    const block = extractRouteBlock(content, match.index + match[0].length - 1);
    const pathMatch = block.match(/^\(\s*[\r\n\s]*"([^"]+)"/);
    if (!pathMatch) continue;

    const method = match[1].toUpperCase();
    const routePath = pathMatch[1];

    const bodySchema = block.match(/body:\s*(\w+)/)?.[1] ?? null;
    const querySchema = block.match(/query:\s*(\w+)/)?.[1] ?? null;
    const paramsSchema = block.match(/params:\s*(\w+)/)?.[1] ?? null;

    const needsAuth = block.includes("authMiddleware");
    const needsTenant = block.includes("tenantMiddleware");
    const needsMaintainer = block.includes("requireMaintainerApiKey");

    const permissionMatch =
      block.match(/requirePermission\("([^"]+)"\)/) ??
      block.match(/requireAnyPermission\(\[([^\]]+)\]\)/);
    const permission = permissionMatch
      ? permissionMatch[1].replace(/"/g, "").replace(/\s*,\s*/g, " | ")
      : null;

    routes.push({
      method,
      path: routePath,
      bodySchema,
      querySchema,
      paramsSchema,
      needsAuth,
      needsTenant,
      needsMaintainer,
      permission,
    });
  }
  return routes;
}

function parseRouterMounts(content, routerVarName) {
  const mounts = [];
  const useRe = new RegExp(`${routerVarName}\\.use\\(`, "g");
  let match;
  while ((match = useRe.exec(content))) {
    const block = extractRouteBlock(content, match.index + match[0].length - 1);
    const pathMatch = block.match(/^\(\s*[\r\n\s]*"([^"]+)"/);
    const routerMatch = block.match(/,\s*[\r\n\s]*(\w+Router)/);
    if (pathMatch && routerMatch) {
      mounts.push({ mountPath: pathMatch[1], routerName: routerMatch[1] });
    }
  }
  return mounts;
}

function getRouterVarName(content) {
  const match = content.match(/const\s+(\w+Router)\s*=\s*Router/);
  return match?.[1] ?? null;
}

function joinPaths(base, segment) {
  const a = base.replace(/\/+$/, "");
  const b = segment.replace(/^\/+/, "");
  if (!b) return a || "/";
  return `${a}/${b}`.replace(/\/+/g, "/");
}

function collectRoutes(filePath, mountPath, visited = new Set()) {
  const key = `${filePath}::${mountPath}`;
  if (visited.has(key)) return [];
  visited.add(key);

  const content = readFile(filePath);
  const routerVar = getRouterVarName(content);
  if (!routerVar) return [];

  const imports = parseImports(content, filePath);
  const endpoints = [];

  for (const route of parseRouteDefinitions(content, routerVar)) {
    endpoints.push({
      ...route,
      fullPath: joinPaths(mountPath, route.path),
      sourceFile: path.relative(ROOT, filePath),
    });
  }

  for (const mount of parseRouterMounts(content, routerVar)) {
    const childFile = imports.get(mount.routerName);
    if (!childFile) continue;
    const childMount = joinPaths(mountPath, mount.mountPath);
    endpoints.push(...collectRoutes(childFile, childMount, visited));
  }

  return endpoints;
}

function toPostmanPath(fullPath) {
  return fullPath
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        const name = segment.slice(1);
        return `{{${name}}}`;
      }
      return segment;
    });
}

function buildRawUrl(fullPath) {
  const segments = toPostmanPath(fullPath);
  return {
    raw: `{{baseUrl}}${fullPath.replace(/:([a-zA-Z0-9_]+)/g, "{{$1}}")}`,
    host: ["{{baseUrl}}"],
    path: segments,
  };
}

function buildHeaders(endpoint) {
  const headers = [{ key: "Content-Type", value: "application/json" }];

  if (endpoint.needsMaintainer) {
    headers.push({
      key: "x-maintainer-api-key",
      value: "{{maintainerApiKey}}",
    });
    return headers;
  }

  if (endpoint.needsAuth) {
    headers.push({
      key: "Authorization",
      value: "Bearer {{accessToken}}",
    });
  }

  return headers;
}

function buildQuery(endpoint) {
  const params = inferQueryParams(endpoint.querySchema);
  if (params.length === 0) return undefined;

  const defaults = {
    limit: "20",
    offset: "0",
    periodPreset: "this_month",
    timezone: "America/Sao_Paulo",
    compareMode: "none",
    granularity: "day",
    sortBy: "revenue",
    type: "ORCAMENTO",
    status: "ABERTA",
  };

  return params.map((key) => ({
    key,
    value: defaults[key] ?? "",
    disabled: !["limit", "offset", "periodPreset"].includes(key),
  }));
}

function buildBody(endpoint) {
  if (!["POST", "PUT", "PATCH"].includes(endpoint.method)) return undefined;
  if (endpoint.bodySchema === "emptyBodySchema") return undefined;

  const example =
    BODY_EXAMPLES[endpoint.bodySchema] ??
    (endpoint.bodySchema?.startsWith("patch")
      ? { description: "Campos parciais conforme schema" }
      : endpoint.bodySchema?.startsWith("create")
        ? { description: "Corpo conforme schema do módulo" }
        : null);

  if (!example) return undefined;

  return {
    mode: "raw",
    raw: JSON.stringify(example, null, 2),
    options: { raw: { language: "json" } },
  };
}

function buildRequestName(endpoint) {
  const actionMap = {
    GET: endpoint.path.includes(":") ? "Obter" : "Listar",
    POST: "Criar",
    PATCH: "Atualizar",
    PUT: "Substituir",
    DELETE: "Excluir",
  };
  const segment = endpoint.path.split("/").filter(Boolean).pop() ?? "raiz";
  const label = segment.startsWith(":") ? segment.slice(1) : segment;
  return `${endpoint.method} ${actionMap[endpoint.method] ?? endpoint.method} ${label}`;
}

function buildDescription(endpoint) {
  const lines = [];
  if (endpoint.permission) lines.push(`Permissão: \`${endpoint.permission}\``);
  if (endpoint.needsTenant) lines.push("Requer contexto de empresa (tenant) no token.");
  if (endpoint.bodySchema) lines.push(`Body schema: \`${endpoint.bodySchema}\``);
  if (endpoint.querySchema) lines.push(`Query schema: \`${endpoint.querySchema}\``);
  if (endpoint.paramsSchema) lines.push(`Params schema: \`${endpoint.paramsSchema}\``);
  lines.push(`Fonte: \`${endpoint.sourceFile}\``);
  return lines.join("\n\n");
}

function createRequestItem(endpoint) {
  const item = {
    name: buildRequestName(endpoint),
    request: {
      method: endpoint.method,
      header: buildHeaders(endpoint),
      url: buildRawUrl(endpoint.fullPath),
      description: buildDescription(endpoint),
    },
    response: [],
  };

  const query = buildQuery(endpoint);
  if (query) item.request.url.query = query;

  const body = buildBody(endpoint);
  if (body) item.request.body = body;

  return item;
}

function folderKey(fullPath) {
  const withoutApi = fullPath.replace(/^\/api\/v1\/?/, "");
  const parts = withoutApi.split("/").filter(Boolean);
  if (parts.length === 0) return "Raiz";
  return parts[0];
}

function subFolderKey(fullPath) {
  const withoutApi = fullPath.replace(/^\/api\/v1\/?/, "");
  const parts = withoutApi.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(1).join(" / ");
}

function nestFolders(endpoints) {
  const top = new Map();

  for (const endpoint of endpoints) {
    const topKey = folderKey(endpoint.fullPath);
    if (!top.has(topKey)) top.set(topKey, new Map());

    const subKey = subFolderKey(endpoint.fullPath) ?? "_root";
    const subMap = top.get(topKey);
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey).push(endpoint);
  }

  const folders = [];

  for (const [topName, subMap] of [...top.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const subFolders = [];

    for (const [subName, items] of [...subMap.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const sorted = items.sort((a, b) => {
        const pathCmp = a.fullPath.localeCompare(b.fullPath);
        return pathCmp !== 0 ? pathCmp : a.method.localeCompare(b.method);
      });

      if (subName === "_root") {
        subFolders.push(...sorted.map(createRequestItem));
      } else {
        subFolders.push({
          name: subName,
          item: sorted.map(createRequestItem),
        });
      }
    }

    folders.push({
      name: formatFolderName(topName),
      item: subFolders,
    });
  }

  return folders;
}

function formatFolderName(key) {
  const names = {
    auth: "Auth",
    addresses: "Endereços",
    enterprises: "Empresas",
    departments: "Departamentos",
    maintainer: "Maintainer",
    units: "Unidades de Medida",
    "types-products": "Tipos de Produto",
    "type-sped": "Tipos SPED",
    "products-ncm": "NCM",
    "products-cest": "CEST",
    "products-anp": "ANP",
    "products-nbs": "NBS",
    "icms-taxation": "Tributação ICMS",
    "product-groups": "Grupos de Produto",
    "product-subgroups": "Subgrupos de Produto",
    "product-brands": "Marcas de Produto",
    "pis-cofins-situation": "Situação PIS/COFINS",
    "stock-sectors": "Setores de Estoque",
    "stock-locations": "Locações de Estoque",
    "stock-batches": "Lotes de Estoque",
    "stock-batch-balances": "Saldos de Lote",
    "payment-types": "Tipos de Pagamento",
    products: "Produtos",
    "products-enterprises": "Produtos por Empresa",
    "product-taxation": "Tributação de Produto",
    "product-applications": "Aplicações de Produto",
    prices: "Preços",
    "promotional-prices": "Preços Promocionais",
    "stock-sectors-rental": "Aluguel de Setores",
    "stock-min-max": "Estoque Mín/Máx",
    "stock-movements": "Movimentos de Estoque",
    sales: "Vendas",
    "type-networks": "Tipos de Rede",
    "type-supplier-customers": "Tipos Fornecedor/Cliente",
  };
  return names[key] ?? key;
}

function createHealthRequest() {
  return {
    name: "GET Health Check",
    request: {
      method: "GET",
      header: [],
      url: {
        raw: "{{baseUrl}}/health",
        host: ["{{baseUrl}}"],
        path: ["health"],
      },
      description: "Verifica se o servidor está operacional.",
    },
    response: [],
  };
}

function createLoginTests() {
  return {
    listen: "test",
    script: {
      type: "text/javascript",
      exec: [
        "const json = pm.response.json();",
        "const data = json?.data ?? json;",
        "if (data?.accessToken) pm.collectionVariables.set('accessToken', data.accessToken);",
        "if (data?.refreshToken) pm.collectionVariables.set('refreshToken', data.refreshToken);",
        "if (data?.user?.id) pm.collectionVariables.set('userId', data.user.id);",
        "if (data?.activeEnterprise?.id) pm.collectionVariables.set('enterpriseId', data.activeEnterprise.id);",
      ],
    },
  };
}

function createCollection(endpoints) {
  const items = [createHealthRequest(), ...nestFolders(endpoints)];

  const collection = {
    info: {
      _postman_id: "gescom-api-complete",
      name: "Gescom API — Completa",
      description:
        "Coleção gerada automaticamente a partir dos arquivos `routes.ts` do projeto gescom-api.\n\n" +
        `Total de endpoints: ${endpoints.length}\n` +
        `Gerado em: ${new Date().toISOString()}\n\n` +
        "**Fluxo sugerido:**\n" +
        "1. `GET /health`\n" +
        "2. `POST /api/v1/auth/login`\n" +
        "3. `POST /api/v1/auth/switch-enterprise` (se necessário)\n" +
        "4. Demais rotas com Bearer token\n\n" +
        "Rotas **Maintainer** usam `x-maintainer-api-key` em vez de Bearer.",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
    variable: [
      { key: "baseUrl", value: "http://localhost:3000" },
      { key: "accessToken", value: "" },
      { key: "refreshToken", value: "" },
      { key: "enterpriseId", value: "" },
      { key: "userId", value: "" },
      { key: "memberId", value: "" },
      { key: "departmentId", value: "" },
      { key: "saleId", value: "" },
      { key: "saleItemId", value: "" },
      { key: "productEnterpriseId", value: "" },
      { key: "unitId", value: "" },
      { key: "productTypeId", value: "" },
      { key: "paymentTypeId", value: "" },
      { key: "cepId", value: "" },
      { key: "maintainerApiKey", value: "" },
    ],
    event: [
      {
        listen: "prerequest",
        script: {
          type: "text/javascript",
          exec: [""],
        },
      },
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [""],
        },
      },
    ],
  };

  attachLoginScript(collection);
  return collection;
}

function attachLoginScript(collection) {
  const walk = (items) => {
    for (const item of items) {
      if (item.item) {
        walk(item.item);
        continue;
      }
      if (item.request?.url?.raw?.includes("/auth/login")) {
        item.event = [createLoginTests()];
      }
    }
  };
  walk(collection.item);
}

function createEnvironment(name, baseUrl) {
  return {
    id: `gescom-api-${name}`,
    name: `Gescom API — ${name}`,
    values: [
      { key: "baseUrl", value: baseUrl, type: "default", enabled: true },
      { key: "accessToken", value: "", type: "secret", enabled: true },
      { key: "refreshToken", value: "", type: "secret", enabled: true },
      { key: "enterpriseId", value: "", type: "default", enabled: true },
      { key: "userId", value: "", type: "default", enabled: true },
      { key: "memberId", value: "", type: "default", enabled: true },
      { key: "departmentId", value: "", type: "default", enabled: true },
      { key: "saleId", value: "", type: "default", enabled: true },
      { key: "saleItemId", value: "", type: "default", enabled: true },
      { key: "productEnterpriseId", value: "", type: "default", enabled: true },
      { key: "unitId", value: "", type: "default", enabled: true },
      { key: "productTypeId", value: "", type: "default", enabled: true },
      { key: "paymentTypeId", value: "", type: "default", enabled: true },
      { key: "cepId", value: "", type: "default", enabled: true },
      {
        key: "maintainerApiKey",
        value: "",
        type: "secret",
        enabled: true,
      },
    ],
    _postman_variable_scope: "environment",
  };
}

function splitByModule(endpoints) {
  const groups = new Map();
  for (const ep of endpoints) {
    const key = folderKey(ep.fullPath);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ep);
  }
  return groups;
}

function createModuleCollection(moduleKey, endpoints) {
  const label = formatFolderName(moduleKey);
  const collection = createCollection(endpoints);
  collection.info._postman_id = `gescom-api-${moduleKey}`;
  collection.info.name = `Gescom API — ${label}`;
  collection.info.description =
    `Coleção do módulo **${label}** (${endpoints.length} endpoints).\n\n` +
    `Gerado em: ${new Date().toISOString()}\n\n` +
    "Use o ambiente `gescom-api-local.postman_environment.json` para variáveis.";
  collection.item = nestFolders(endpoints);
  if (moduleKey === "auth") {
    collection.item = [createHealthRequest(), ...collection.item];
  }
  attachLoginScript(collection);
  return collection;
}

function writeJson(fileName, data) {
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  return outPath;
}

function main() {
  const v1Index = path.join(SRC, "routes", "v1", "index.ts");
  const content = readFile(v1Index);
  const imports = parseImports(content, v1Index);
  const routerVar = getRouterVarName(content) ?? "v1Router";

  let endpoints = [];

  for (const mount of parseRouterMounts(content, routerVar)) {
    const childFile = imports.get(mount.routerName);
    if (!childFile) {
      console.warn(`Router não resolvido: ${mount.routerName}`);
      continue;
    }
    const mountPath = joinPaths(API_PREFIX, mount.mountPath);
    endpoints.push(...collectRoutes(childFile, mountPath));
  }

  const seen = new Set();
  endpoints = endpoints
    .filter((ep) => {
      const key = `${ep.method} ${ep.fullPath}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const pathCmp = a.fullPath.localeCompare(b.fullPath);
      return pathCmp !== 0 ? pathCmp : a.method.localeCompare(b.method);
    });

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const completePath = writeJson(
    "gescom-api-complete.postman_collection.json",
    createCollection(endpoints),
  );

  const moduleGroups = splitByModule(endpoints);
  const modulePaths = [];
  for (const [moduleKey, moduleEndpoints] of [...moduleGroups.entries()].sort()) {
    const modulePath = writeJson(
      `gescom-api-${moduleKey}.postman_collection.json`,
      createModuleCollection(moduleKey, moduleEndpoints),
    );
    modulePaths.push(modulePath);
  }

  const envLocal = writeJson(
    "gescom-api-local.postman_environment.json",
    createEnvironment("Local", "http://localhost:3000"),
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    totalEndpoints: endpoints.length,
    completeCollection: path.basename(completePath),
    moduleCollections: modulePaths.map((p) => path.basename(p)),
    environment: path.basename(envLocal),
  };

  writeJson("generation-summary.json", summary);

  console.log(`✓ ${endpoints.length} endpoints mapeados`);
  console.log(`✓ Coleção completa: ${completePath}`);
  console.log(`✓ ${modulePaths.length} coleções por módulo`);
  console.log(`✓ Ambiente: ${envLocal}`);
}

main();
