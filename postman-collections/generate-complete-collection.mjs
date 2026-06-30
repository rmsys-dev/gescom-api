#!/usr/bin/env node
/**
 * Gera a collection Postman completa da Gescom API.
 * Execute: node postman-collections/generate-complete-collection.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bearer = [{ key: "Authorization", value: "Bearer {{accessToken}}" }];
const maintainer = [{ key: "X-Maintainer-Api-Key", value: "{{maintainerApiKey}}" }];
const jsonContent = [{ key: "Content-Type", value: "application/json" }];

function headers(auth) {
  if (auth === "bearer") return [...bearer];
  if (auth === "maintainer") return [...maintainer, ...jsonContent];
  if (auth === "json") return [...jsonContent];
  return [];
}

function req(name, method, path, opts = {}) {
  const { auth = "bearer", body, query, description } = opts;
  const request = {
    method,
    header: headers(auth),
    url: path.startsWith("{{") ? path : `{{baseUrl}}${path}`,
  };
  if (body !== undefined) {
    request.header = [...request.header, ...jsonContent.filter((h) => !request.header.some((x) => x.key === h.key))];
    request.body = { mode: "raw", raw: typeof body === "string" ? body : JSON.stringify(body, null, 2) };
  }
  if (query) {
    const rawPath = path.startsWith("{{") ? path : `{{baseUrl}}${path}`;
    const sep = rawPath.includes("?") ? "&" : "?";
    const qs = query.map((q) => `${q.key}=${q.value}`).join("&");
    request.url = `${rawPath}${sep}${qs}`;
  }
  const item = { name, request, response: [] };
  if (description) item.description = description;
  return item;
}

function folder(name, items, description) {
  const f = { name, item: items };
  if (description) f.description = description;
  return f;
}

const loginTestScript = {
  listen: "test",
  script: {
    type: "text/javascript",
    exec: [
      "const json = pm.response.json();",
      "if (json.data?.accessToken) {",
      "  pm.environment.set('accessToken', json.data.accessToken);",
      "  pm.collectionVariables.set('accessToken', json.data.accessToken);",
      "  pm.environment.set('refreshToken', json.data.refreshToken);",
      "  pm.collectionVariables.set('refreshToken', json.data.refreshToken);",
      "}",
      "if (json.data?.enterprises?.[0]?.id) {",
      "  pm.environment.set('enterpriseId', json.data.enterprises[0].id);",
      "  pm.collectionVariables.set('enterpriseId', json.data.enterprises[0].id);",
      "}",
      "pm.test('Status 2xx', () => pm.response.to.be.success);",
    ],
  },
};

function withLoginTest(item) {
  return { ...item, event: [loginTestScript] };
}

function crudFolder(baseName, basePath, idVar, createBody, patchBody, opts = {}) {
  const id = `{{${idVar}}}`;
  const listQuery = opts.listQuery ?? [{ key: "limit", value: "20" }, { key: "offset", value: "0" }];
  return folder(baseName, [
    req(`Listar ${baseName}`, "GET", basePath, { query: listQuery }),
    req(`Buscar ${baseName} por ID`, "GET", `${basePath}/${id}`),
    req(`Criar ${baseName}`, "POST", basePath, { body: createBody }),
    req(`Atualizar ${baseName}`, "PATCH", `${basePath}/${id}`, { body: patchBody }),
    req(`Excluir ${baseName}`, "DELETE", `${basePath}/${id}`),
  ]);
}

const collection = {
  info: {
    name: "Gescom API - Completa (Supabase)",
    description:
      "Collection completa da Gescom API v1 para testes locais conectados ao Supabase.\n\n" +
      "**Configuração:**\n" +
      "1. Importe o environment `gescom-api-local-supabase.postman_environment.json`\n" +
      "2. Preencha `login` e `password` no environment\n" +
      "3. Execute **Auth > Login** para obter tokens\n" +
      "4. Use **Auth > Switch Enterprise** se tiver múltiplas empresas\n\n" +
      "**Variáveis comuns:** `enterpriseId`, `userId`, `memberId`, `productId`, etc.\n\n" +
      "Base URL padrão: `http://localhost:3000/api/v1` (PORT do .env)",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
  },
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "// Propaga accessToken do environment para a collection",
          "const token = pm.environment.get('accessToken');",
          "if (token) pm.collectionVariables.set('accessToken', token);",
        ],
      },
    },
  ],
  variable: [
    { key: "baseUrl", value: "http://localhost:3000/api/v1" },
    { key: "accessToken", value: "" },
    { key: "refreshToken", value: "" },
    { key: "enterpriseId", value: "" },
    { key: "userId", value: "" },
    { key: "memberId", value: "" },
    { key: "departmentId", value: "" },
    { key: "memberDepartmentId", value: "" },
    { key: "countryId", value: "" },
    { key: "stateId", value: "" },
    { key: "cityId", value: "" },
    { key: "cepId", value: "" },
    { key: "addressId", value: "" },
    { key: "productId", value: "" },
    { key: "productEnterpriseId", value: "" },
    { key: "productTaxationId", value: "" },
    { key: "productApplicationId", value: "" },
    { key: "unitId", value: "" },
    { key: "typeProductId", value: "" },
    { key: "typeSpedId", value: "" },
    { key: "productsNcmId", value: "" },
    { key: "productsCestId", value: "" },
    { key: "productsAnpId", value: "" },
    { key: "productsNbsId", value: "" },
    { key: "icmsTaxationId", value: "" },
    { key: "pisCofinsSituationId", value: "" },
    { key: "productGroupId", value: "" },
    { key: "productSubgroupId", value: "" },
    { key: "productBrandId", value: "" },
    { key: "priceId", value: "" },
    { key: "promotionalPriceId", value: "" },
    { key: "stockSectorId", value: "" },
    { key: "stockLocationId", value: "" },
    { key: "stockBatchId", value: "" },
    { key: "stockBatchBalanceId", value: "" },
    { key: "stockSectorRentalId", value: "" },
    { key: "stockMinMaxId", value: "" },
    { key: "stockMovementId", value: "" },
    { key: "paymentTypeId", value: "" },
    { key: "saleId", value: "" },
    { key: "saleItemId", value: "" },
    { key: "salesReturnId", value: "" },
    { key: "typeNetworkId", value: "" },
    { key: "typeSupplierCustomerId", value: "" },
    { key: "contactId", value: "" },
    { key: "login", value: "" },
    { key: "password", value: "" },
    { key: "maintainerApiKey", value: "" },
  ],
  item: [
    folder("00 - Health", [
      req("Health Check", "GET", "{{healthUrl}}/health", { auth: "none" }),
    ]),

    folder("01 - Auth", [
      withLoginTest(
        req("Login", "POST", "/auth/login", {
          auth: "json",
          body: {
            loginType: "EMAIL",
            login: "{{login}}",
            password: "{{password}}",
          },
        }),
      ),
      req("Refresh Token", "POST", "/auth/refresh", {
        auth: "json",
        body: { refreshToken: "{{refreshToken}}" },
      }),
      req("Logout", "POST", "/auth/logout", { auth: "bearer", body: {} }),
      withLoginTest(
        req("Switch Enterprise", "POST", "/auth/switch-enterprise", {
          auth: "bearer",
          body: { enterpriseId: "{{enterpriseId}}" },
        }),
      ),
      req("Me", "GET", "/auth/me", { auth: "bearer" }),
      req("First Access - Lookup", "POST", "/auth/first-access/lookup", {
        auth: "json",
        body: { email: "{{login}}" },
      }),
      req("First Access - Verify", "POST", "/auth/first-access/verify", {
        auth: "json",
        body: {
          loginType: "EMAIL",
          login: "{{login}}",
          code: "000000",
          password: "NovaSenha@123",
          confirmPassword: "NovaSenha@123",
        },
      }),
      req("First Access - Resend", "POST", "/auth/first-access/resend", {
        auth: "json",
        body: { email: "{{login}}" },
      }),
      req("Password Reset - Request", "POST", "/auth/password-reset/request", {
        auth: "json",
        body: { email: "{{login}}" },
      }),
      req("Password Reset - Verify", "POST", "/auth/password-reset/verify", {
        auth: "json",
        body: {
          loginType: "EMAIL",
          login: "{{login}}",
          code: "000000",
          password: "NovaSenha@123",
          confirmPassword: "NovaSenha@123",
        },
      }),
      req("Password Reset - Resend", "POST", "/auth/password-reset/resend", {
        auth: "json",
        body: { email: "{{login}}" },
      }),
      req("Invitation - Accept", "POST", "/auth/invitations/{{memberId}}/accept", {
        auth: "json",
        body: {
          loginType: "EMAIL",
          login: "{{login}}",
          password: "{{password}}",
          code: "000000",
        },
      }),
      req("Invitation - Decline", "POST", "/auth/invitations/{{memberId}}/decline", {
        auth: "bearer",
        body: { reason: "Teste Postman" },
      }),
      req("Invitation - Resend", "POST", "/auth/invitations/{{memberId}}/resend", {
        auth: "bearer",
        body: {},
      }),
    ]),

    folder("02 - Maintainer", [
      req("Criar Enterprise", "POST", "/maintainer/enterprises", {
        auth: "maintainer",
        body: {
          registration: "12345678000199",
          legalName: "Empresa Teste Postman LTDA",
          tradeName: "Empresa Teste",
          phone: "11999990000",
          email: "empresa.teste@exemplo.com",
        },
      }),
      req("Excluir Enterprise", "DELETE", "/maintainer/enterprises/{{enterpriseId}}", {
        auth: "maintainer",
      }),
      req("Criar Department", "POST", "/maintainer/departments", {
        auth: "maintainer",
        body: {
          name: "Departamento Teste",
          description: "Criado via Postman",
          permissionReference: "vendas",
        },
      }),
      req("Atualizar Department", "PATCH", "/maintainer/departments/{{departmentId}}", {
        auth: "maintainer",
        body: { description: "Atualizado via Postman" },
      }),
    ]),

    folder("03 - Enterprises", [
      req("Listar Enterprises", "GET", "/enterprises", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Enterprise", "GET", "/enterprises/{{enterpriseId}}"),
      req("Atualizar Enterprise", "PATCH", "/enterprises/{{enterpriseId}}", {
        body: { tradeName: "Nome Fantasia Atualizado" },
      }),
      folder("Addresses", [
        req("Listar Endereços", "GET", "/enterprises/{{enterpriseId}}/addresses"),
        req("Criar Endereço", "POST", "/enterprises/{{enterpriseId}}/addresses", {
          body: { cepId: "{{cepId}}", number: "100", complement: "Sala 1", adressType: "PRINCIPAL" },
        }),
        req("Atualizar Endereço", "PATCH", "/enterprises/{{enterpriseId}}/addresses/{{addressId}}", {
          body: { number: "101" },
        }),
      ]),
      folder("Product Catalog (Enterprise)", [
        req("Listar Marcas", "GET", "/enterprises/{{enterpriseId}}/product-brands"),
        req("Listar Grupos", "GET", "/enterprises/{{enterpriseId}}/product-groups"),
        req("Listar Subgrupos", "GET", "/enterprises/{{enterpriseId}}/product-subgroups"),
      ]),
    ]),

    folder("04 - Departments", [
      req("Listar Departments", "GET", "/departments", {
        query: [{ key: "limit", value: "50" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Department", "GET", "/departments/{{departmentId}}"),
    ]),

    folder("05 - Addresses", [
      folder("Countries", [
        req("Listar Países", "GET", "/addresses/countries", {
          query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
        }),
        req("Criar País", "POST", "/addresses/countries", {
          body: {
            countryCode: "BR",
            countryName: "Brasil Teste",
            cbsTax: 0,
            isTax: 0,
            ibs_uf_tax: 0,
            ibs_municipal_tax: 0,
          },
        }),
        req("Atualizar País", "PATCH", "/addresses/countries/{{countryId}}", {
          body: { countryName: "Brasil Atualizado" },
        }),
      ]),
      folder("States", [
        req("Listar Estados", "GET", "/addresses/states", {
          query: [
            { key: "limit", value: "20" },
            { key: "offset", value: "0" },
            { key: "countryId", value: "{{countryId}}" },
          ],
        }),
        req("Criar Estado", "POST", "/addresses/states", {
          body: {
            acronym: "TS",
            description: "Estado Teste",
            internalAliquot: 18,
            interstateAliquot: 12,
            fcpAliquot: 0,
            borders: false,
            generate_st: false,
            embedDifal: false,
            ibs_uf_tax: 0,
            ibs_municipal_tax: 0,
            countryId: "{{countryId}}",
          },
        }),
        req("Atualizar Estado", "PATCH", "/addresses/states/{{stateId}}", {
          body: { description: "Estado Atualizado" },
        }),
      ]),
      folder("Cities", [
        req("Listar Cidades", "GET", "/addresses/cities", {
          query: [
            { key: "limit", value: "20" },
            { key: "offset", value: "0" },
            { key: "stateId", value: "{{stateId}}" },
          ],
        }),
        req("Criar Cidade", "POST", "/addresses/cities", {
          body: {
            ibgeCode: "9999999",
            citieName: "Cidade Teste",
            ibs_municipal_tax: 0,
            stateId: "{{stateId}}",
          },
        }),
        req("Atualizar Cidade", "PATCH", "/addresses/cities/{{cityId}}", {
          body: { citieName: "Cidade Atualizada" },
        }),
      ]),
      folder("CEPs", [
        req("Listar CEPs", "GET", "/addresses/ceps", {
          query: [
            { key: "limit", value: "20" },
            { key: "offset", value: "0" },
            { key: "cityId", value: "{{cityId}}" },
          ],
        }),
        req("Criar CEP", "POST", "/addresses/ceps", {
          body: {
            cepNumber: "01310100",
            address: "Av Paulista",
            neighborhood: "Bela Vista",
            cityId: "{{cityId}}",
          },
        }),
        req("Atualizar CEP", "PATCH", "/addresses/ceps/{{cepId}}", {
          body: { complement: "Atualizado" },
        }),
      ]),
    ]),

    folder("06 - Members", [
      req("Listar Members", "GET", "/enterprises/{{enterpriseId}}/members", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Member por Código", "GET", "/enterprises/{{enterpriseId}}/members/code/1"),
      req("Buscar Member", "GET", "/enterprises/{{enterpriseId}}/members/{{memberId}}"),
      req("Criar Member com User", "POST", "/enterprises/{{enterpriseId}}/members/create-with-user", {
        body: {
          user: {
            userName: "Membro Teste Postman",
            userRegistration: "52998224725",
            userEmail: "membro.postman@exemplo.com",
            userPhone: "11999990002",
          },
          member: { class: "CLIENTE", departments: [], code: 1001 },
          sendEmail: false,
        },
      }),
      req("Convidar Member", "POST", "/enterprises/{{enterpriseId}}/members/invite", {
        body: {
          member: { class: "VENDEDOR", departments: [] },
          inviteEmail: "convite@exemplo.com",
          sendEmail: false,
        },
      }),
      req("Criar Member (user existente)", "POST", "/enterprises/{{enterpriseId}}/members", {
        body: { userId: "{{userId}}", class: "CLIENTE", departments: [] },
      }),
      req("Vincular Department", "POST", "/enterprises/{{enterpriseId}}/members/{{memberId}}/departments", {
        body: { departmentId: "{{departmentId}}", mainDepartment: true },
      }),
      req("Atualizar Member Department", "PATCH", "/enterprises/{{enterpriseId}}/members/{{memberId}}/departments/{{memberDepartmentId}}", {
        body: { mainDepartment: true },
      }),
      req("Permissões Default", "PATCH", "/enterprises/{{enterpriseId}}/members/{{memberId}}/departments/{{departmentId}}/permissions-default", {
        body: { permission: "consultar_produtos", status: true },
      }),
      req("Permissões Extra", "PATCH", "/enterprises/{{enterpriseId}}/members/{{memberId}}/departments/{{departmentId}}/extra-permissions", {
        body: { permission: "alterar_produtos", status: true },
      }),
      req("Atualizar Member", "PATCH", "/enterprises/{{enterpriseId}}/members/{{memberId}}", {
        body: { saleLimit: 10000 },
      }),
    ]),

    folder("07 - Users & Onboarding", [
      req("Listar Users", "GET", "/enterprises/{{enterpriseId}}/users", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar User", "GET", "/enterprises/{{enterpriseId}}/users/{{userId}}"),
      req("Criar User", "POST", "/enterprises/{{enterpriseId}}/users", {
        body: {
          userName: "User Teste",
          userRegistration: "12345678901",
          userEmail: "user.teste@exemplo.com",
          userPhone: "11999990003",
        },
      }),
      req("Atualizar User", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}", {
        body: { userName: "User Atualizado" },
      }),
      folder("Onboarding", [
        req("Detalhes", "GET", "/enterprises/{{enterpriseId}}/users/{{userId}}/details"),
        req("Criar Personal Info", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/personal-info", {
          body: { gender: "MASCULINO", birthDate: "1990-01-15", placeOfBirth: "São Paulo" },
        }),
        req("Atualizar Personal Info", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/personal-info", {
          body: { placeOfBirth: "Campinas" },
        }),
        req("Criar Endereço User", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/addresses", {
          body: { cepId: "{{cepId}}", number: "200", adressType: "PRINCIPAL" },
        }),
        req("Atualizar Endereço User", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/addresses/{{addressId}}", {
          body: { number: "201" },
        }),
        req("Criar Contato", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/contacts", {
          body: { phone: "11999990004", email: "contato@exemplo.com", type: "PRINCIPAL" },
        }),
        req("Atualizar Contato", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/contacts/{{contactId}}", {
          body: { phone: "11999990005" },
        }),
        req("Criar Relacionamento", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/relationships", {
          body: { maritalStatus: "SOLTEIRO", profession: "Analista" },
        }),
        req("Atualizar Relacionamento", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/relationships", {
          body: { profession: "Desenvolvedor" },
        }),
        req("Criar Tax Info", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/tax-infos", {
          body: { stateRegistration: "123456789" },
        }),
        req("Atualizar Tax Info", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/tax-infos", {
          body: { municipalRegistration: "987654" },
        }),
        req("Criar Financial Info", "POST", "/enterprises/{{enterpriseId}}/users/{{userId}}/financial-info", {
          body: { discountLimit: 10, taxRegime: "SIMPLES" },
        }),
        req("Atualizar Financial Info", "PATCH", "/enterprises/{{enterpriseId}}/users/{{userId}}/financial-info", {
          body: { discountLimit: 15 },
        }),
      ]),
    ]),

    folder("08 - Memberships Types", [
      crudFolder("Type Networks", "/type-networks", "typeNetworkId", { description: "Rede Teste", status: true }, { description: "Rede Atualizada" }),
      crudFolder(
        "Type Supplier Customers",
        "/type-supplier-customers",
        "typeSupplierCustomerId",
        { description: "Tipo Fornecedor/Cliente", status: true },
        { description: "Tipo Atualizado" },
      ),
    ]),

    crudFolder("Units", "/units", "unitId", { unit: "UN", description: "Unidade", compatible: true }, { description: "Unidade Atualizada" }),
    crudFolder("Type SPED", "/type-sped", "typeSpedId", { type: "00", description: "Tipo SPED", generateInventory: false }, { description: "Atualizado" }),
    crudFolder("Types Products", "/types-products", "typeProductId", { type: "P", description: "Produto", manufacturing: true, sales: true, typeSpedId: "{{typeSpedId}}" }, { description: "Atualizado" }),
    crudFolder("Products NCM", "/products-ncm", "productsNcmId", { ncm: "12345678", description: "NCM Teste" }, { description: "NCM Atualizado" }),
    crudFolder("Products CEST", "/products-cest", "productsCestId", { cest: "1234567", description: "CEST Teste", productsNcmId: "{{productsNcmId}}" }, { description: "Atualizado" }),
    crudFolder("Products ANP", "/products-anp", "productsAnpId", { anp: "123456789", description: "ANP Teste" }, { description: "Atualizado" }),
    crudFolder(
      "Products NBS",
      "/products-nbs",
      "productsNbsId",
      {
        lc116Item: "1.01",
        lc116Description: "Desc LC116",
        nbs: "123456789",
        description: "NBS Teste",
        psOnerosa: true,
        adqExterior: false,
        indop: "1",
        cClassTrib: "01",
        cClassTribName: "Classe",
      },
      { description: "Atualizado" },
    ),
    crudFolder("ICMS Taxation", "/icms-taxation", "icmsTaxationId", { icms: "00", description: "Tributação ICMS", icmsRate: 18 }, { description: "Atualizado" }),
    crudFolder(
      "PIS COFINS Situation",
      "/pis-cofins-situation",
      "pisCofinsSituationId",
      { cst: "01", description: "Situação PIS/COFINS", type: "SAIDA", framing: "TRIBUTADO", pisRate: 1.65, cofinsRate: 7.6 },
      { description: "Atualizado" },
    ),
    crudFolder("Product Groups", "/product-groups", "productGroupId", { description: "Grupo Teste", profitMargin: 20 }, { description: "Atualizado" }),
    crudFolder(
      "Product Subgroups",
      "/product-subgroups",
      "productSubgroupId",
      { description: "Subgrupo Teste", generatesComission: false },
      { description: "Atualizado" },
    ),
    crudFolder("Product Brands", "/product-brands", "productBrandId", { description: "Marca Teste" }, { description: "Atualizado" }),

    folder("09 - Products", [
      req("Listar Products", "GET", "/products", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Product", "GET", "/products/{{productId}}"),
      req("Criar Product", "POST", "/products", {
        body: {
          product: { description: "Produto Teste Postman", barCode: "7891234567890" },
          enterprise: {
            description: "Produto Empresa Teste",
            measurementUnitId: "{{unitId}}",
            productTypeId: "{{typeProductId}}",
            productGroupId: "{{productGroupId}}",
            productSubgroupId: "{{productSubgroupId}}",
            productBrandId: "{{productBrandId}}",
          },
        },
      }),
      req("Atualizar Product", "PATCH", "/products/{{productId}}", {
        body: { description: "Produto Atualizado" },
      }),
      req("Excluir Product", "DELETE", "/products/{{productId}}"),
    ]),

    folder("10 - Products Enterprises", [
      req("Listar", "GET", "/products-enterprises", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar por Código", "GET", "/products-enterprises/code/1"),
      req("Buscar por ID", "GET", "/products-enterprises/{{productEnterpriseId}}"),
      req("Criar", "POST", "/products-enterprises", {
        body: {
          productId: "{{productId}}",
          description: "Produto na Empresa",
          measurementUnitId: "{{unitId}}",
          productTypeId: "{{typeProductId}}",
          productGroupId: "{{productGroupId}}",
          productSubgroupId: "{{productSubgroupId}}",
          productBrandId: "{{productBrandId}}",
        },
      }),
      req("Atualizar", "PATCH", "/products-enterprises/{{productEnterpriseId}}", {
        body: { description: "Atualizado" },
      }),
      req("Excluir", "DELETE", "/products-enterprises/{{productEnterpriseId}}"),
    ]),

    crudFolder(
      "Product Taxation",
      "/product-taxation",
      "productTaxationId",
      {
        cst_pis_entrada: "50",
        cst_pis_saida: "01",
        cst_cofins_entrada: "50",
        cst_cofins_saida: "01",
        productsEnterprisesId: "{{productEnterpriseId}}",
        icmsTaxationId: "{{icmsTaxationId}}",
        pisCofinsSituationId: "{{pisCofinsSituationId}}",
      },
      { cst_pis_saida: "02" },
    ),
    crudFolder(
      "Product Applications",
      "/product-applications",
      "productApplicationId",
      { description: "Aplicação Teste", productsEnterprisesId: "{{productEnterpriseId}}" },
      { description: "Atualizado" },
    ),
    crudFolder(
      "Prices",
      "/prices",
      "priceId",
      { price: 99.9, productsEnterprisesId: "{{productEnterpriseId}}" },
      { price: 109.9 },
    ),
    crudFolder(
      "Promotional Prices",
      "/promotional-prices",
      "promotionalPriceId",
      {
        description: "Promoção Teste",
        price: 79.9,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        productsEnterprisesId: "{{productEnterpriseId}}",
      },
      { price: 69.9 },
    ),

    crudFolder("Stock Sectors", "/stock-sectors", "stockSectorId", { description: "Setor Teste" }, { description: "Atualizado" }),
    crudFolder(
      "Stock Locations",
      "/stock-locations",
      "stockLocationId",
      { box: "A1", description: "Localização A1", stockSectorId: "{{stockSectorId}}" },
      { description: "Atualizado" },
    ),
    crudFolder(
      "Stock Batches",
      "/stock-batches",
      "stockBatchId",
      { batchNumber: "LOTE-001", productsEnterprisesId: "{{productEnterpriseId}}" },
      { notes: "Atualizado" },
    ),
    crudFolder(
      "Stock Batch Balances",
      "/stock-batch-balances",
      "stockBatchBalanceId",
      { stockBatchId: "{{stockBatchId}}", stockLocationId: "{{stockLocationId}}", quantity: 100 },
      { quantity: 150 },
    ),
    crudFolder(
      "Stock Sectors Rental",
      "/stock-sectors-rental",
      "stockSectorRentalId",
      { productsEnterprisesId: "{{productEnterpriseId}}", stockLocationId: "{{stockLocationId}}", quantity: 10 },
      { quantity: 20 },
    ),
    crudFolder(
      "Stock Min Max",
      "/stock-min-max",
      "stockMinMaxId",
      { quantityMin: 10, quantityMax: 100, productsEnterprisesId: "{{productEnterpriseId}}" },
      { quantityMin: 15 },
    ),

    folder("11 - Stock Movements", [
      req("Listar Movimentos", "GET", "/stock-movements", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Movimento", "GET", "/stock-movements/{{stockMovementId}}"),
      req("Criar Entrada", "POST", "/stock-movements", {
        body: {
          type: "ENTRADA",
          productsEnterprisesId: "{{productEnterpriseId}}",
          quantity: 50,
          toStockLocationId: "{{stockLocationId}}",
          toStockBatchId: "{{stockBatchId}}",
          notes: "Entrada teste Postman",
        },
      }),
      req("Criar Saída", "POST", "/stock-movements", {
        body: {
          type: "SAIDA",
          productsEnterprisesId: "{{productEnterpriseId}}",
          quantity: 5,
          fromStockLocationId: "{{stockLocationId}}",
          fromStockBatchId: "{{stockBatchId}}",
          notes: "Saída teste Postman",
        },
      }),
      req("Criar Transferência", "POST", "/stock-movements", {
        body: {
          type: "TRANSFERENCIA",
          productsEnterprisesId: "{{productEnterpriseId}}",
          quantity: 10,
          fromStockLocationId: "{{stockLocationId}}",
          toStockLocationId: "{{stockLocationId}}",
          notes: "Transferência teste",
        },
      }),
    ]),

    crudFolder("Payment Types", "/payment-types", "paymentTypeId", { description: "Dinheiro", paymentType: "DINHEIRO" }, { description: "Atualizado" }),

    folder("12 - Sales", [
      req("Listar Vendas", "GET", "/sales", {
        query: [{ key: "limit", value: "20" }, { key: "offset", value: "0" }],
      }),
      req("Buscar Venda", "GET", "/sales/{{saleId}}"),
      req("Criar Orçamento", "POST", "/sales", {
        body: {
          memberId: "{{memberId}}",
          type: "ORCAMENTO",
          items: [
            {
              quantity: 1,
              valueUnit: 100,
              productsEnterprisesId: "{{productEnterpriseId}}",
              unitId: "{{unitId}}",
              productTypeId: "{{typeProductId}}",
            },
          ],
        },
      }),
      req("Criar Venda", "POST", "/sales", {
        body: {
          memberId: "{{memberId}}",
          type: "VENDA",
          items: [
            {
              quantity: 2,
              valueUnit: 50,
              productsEnterprisesId: "{{productEnterpriseId}}",
              unitId: "{{unitId}}",
              productTypeId: "{{typeProductId}}",
            },
          ],
          payments: [{ paymentTypeId: "{{paymentTypeId}}", value: 100 }],
        },
      }),
      req("Atualizar Venda", "PATCH", "/sales/{{saleId}}", {
        body: { percentageDiscount: 5 },
      }),
      req("Recalcular Totais", "POST", "/sales/{{saleId}}/recalculate-totals", { body: {} }),
      req("Converter Orçamento em Venda", "POST", "/sales/{{saleId}}/convert-to-sale", {
        body: {
          status: "FINALIZADA",
          items: [
            {
              quantity: 1,
              valueUnit: 100,
              productsEnterprisesId: "{{productEnterpriseId}}",
              unitId: "{{unitId}}",
              productTypeId: "{{typeProductId}}",
            },
          ],
        },
      }),
      req("Conversões de Orçamento", "GET", "/sales/{{saleId}}/budget-conversions"),
      req("Adicionar Item", "POST", "/sales/{{saleId}}/items", {
        body: {
          quantity: 1,
          valueUnit: 25,
          productsEnterprisesId: "{{productEnterpriseId}}",
          unitId: "{{unitId}}",
          productTypeId: "{{typeProductId}}",
        },
      }),
      req("Atualizar Item", "PATCH", "/sales/{{saleId}}/items/{{saleItemId}}", {
        body: { quantity: 2 },
      }),
      req("Remover Item", "DELETE", "/sales/{{saleId}}/items/{{saleItemId}}"),
      folder("Returns", [
        req("Listar Devoluções", "GET", "/sales/{{saleId}}/returns"),
        req("Devolução Parcial", "POST", "/sales/{{saleId}}/returns/partial", {
          body: { notes: "Devolução parcial teste", items: [{ saleItemId: "{{saleItemId}}", quantity: 1 }] },
        }),
        req("Devolução Total", "POST", "/sales/{{saleId}}/returns/full", {
          body: { notes: "Devolução total teste" },
        }),
        req("Buscar Devolução", "GET", "/sales/{{saleId}}/returns/{{salesReturnId}}"),
      ]),
      folder("Analytics", [
        req("Realized Overview", "GET", "/sales/analytics/realized/overview", {
          query: [
            { key: "startDate", value: "2026-01-01" },
            { key: "endDate", value: "2026-12-31" },
          ],
        }),
        req("Realized Compare", "GET", "/sales/analytics/realized/compare", {
          query: [
            { key: "startDate", value: "2026-01-01" },
            { key: "endDate", value: "2026-12-31" },
            { key: "compareStartDate", value: "2025-01-01" },
            { key: "compareEndDate", value: "2025-12-31" },
          ],
        }),
        req("Realized Timeseries", "GET", "/sales/analytics/realized/timeseries", {
          query: [
            { key: "startDate", value: "2026-01-01" },
            { key: "endDate", value: "2026-12-31" },
            { key: "granularity", value: "month" },
          ],
        }),
        req("Realized By Payment Type", "GET", "/sales/analytics/realized/by-payment-type", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Realized By Seller", "GET", "/sales/analytics/realized/by-seller", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Realized By Customer", "GET", "/sales/analytics/realized/by-customer", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Realized Top Products", "GET", "/sales/analytics/realized/top-products", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }, { key: "limit", value: "10" }],
        }),
        req("Realized By Product Group", "GET", "/sales/analytics/realized/by-product-group", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Realized By Product Brand", "GET", "/sales/analytics/realized/by-product-brand", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Realized Returns", "GET", "/sales/analytics/realized/returns", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Pipeline Overview", "GET", "/sales/analytics/pipeline/overview", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Pipeline Compare", "GET", "/sales/analytics/pipeline/compare", {
          query: [
            { key: "startDate", value: "2026-01-01" },
            { key: "endDate", value: "2026-12-31" },
            { key: "compareStartDate", value: "2025-01-01" },
            { key: "compareEndDate", value: "2025-12-31" },
          ],
        }),
        req("Pipeline Timeseries", "GET", "/sales/analytics/pipeline/timeseries", {
          query: [
            { key: "startDate", value: "2026-01-01" },
            { key: "endDate", value: "2026-12-31" },
            { key: "granularity", value: "month" },
          ],
        }),
        req("Pipeline Budgets", "GET", "/sales/analytics/pipeline/budgets", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Pipeline Budgets Funnel", "GET", "/sales/analytics/pipeline/budgets/funnel", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Operations Status Breakdown", "GET", "/sales/analytics/operations/status-breakdown", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Operations Cancellations", "GET", "/sales/analytics/operations/cancellations", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Receivables Summary", "GET", "/sales/analytics/receivables/summary", {
          query: [{ key: "startDate", value: "2026-01-01" }, { key: "endDate", value: "2026-12-31" }],
        }),
        req("Receivables Aging", "GET", "/sales/analytics/receivables/aging", {
          query: [{ key: "asOfDate", value: "2026-06-26" }],
        }),
      ]),
    ]),
  ],
};

const environment = {
  id: "gescom-local-supabase-prod",
  name: "Gescom API - Local + Supabase (Produção)",
  values: [
    { key: "baseUrl", value: "http://localhost:3000/api/v1", type: "default", enabled: true },
    { key: "healthUrl", value: "http://localhost:3000", type: "default", enabled: true },
    { key: "port", value: "3000", type: "default", enabled: true },
    { key: "supabaseEnv", value: "production", type: "default", enabled: true },
    { key: "supabaseProjectRef", value: "qxecmcnxzpefwecscera", type: "default", enabled: true },
    { key: "supabaseRegion", value: "aws-1-sa-east-1", type: "default", enabled: true },
    { key: "maintainerApiKey", value: "7vGqPPnLSkr9IPvkfsSbX5Dq7QAfjsHS", type: "secret", enabled: true },
    { key: "login", value: "", type: "default", enabled: true },
    { key: "password", value: "", type: "secret", enabled: true },
    { key: "accessToken", value: "", type: "secret", enabled: true },
    { key: "refreshToken", value: "", type: "secret", enabled: true },
    { key: "enterpriseId", value: "", type: "default", enabled: true },
    { key: "userId", value: "", type: "default", enabled: true },
    { key: "memberId", value: "", type: "default", enabled: true },
    { key: "departmentId", value: "", type: "default", enabled: true },
    { key: "memberDepartmentId", value: "", type: "default", enabled: true },
    { key: "countryId", value: "", type: "default", enabled: true },
    { key: "stateId", value: "", type: "default", enabled: true },
    { key: "cityId", value: "", type: "default", enabled: true },
    { key: "cepId", value: "", type: "default", enabled: true },
    { key: "addressId", value: "", type: "default", enabled: true },
    { key: "productId", value: "", type: "default", enabled: true },
    { key: "productEnterpriseId", value: "", type: "default", enabled: true },
    { key: "productTaxationId", value: "", type: "default", enabled: true },
    { key: "productApplicationId", value: "", type: "default", enabled: true },
    { key: "unitId", value: "", type: "default", enabled: true },
    { key: "typeProductId", value: "", type: "default", enabled: true },
    { key: "typeSpedId", value: "", type: "default", enabled: true },
    { key: "productsNcmId", value: "", type: "default", enabled: true },
    { key: "productsCestId", value: "", type: "default", enabled: true },
    { key: "productsAnpId", value: "", type: "default", enabled: true },
    { key: "productsNbsId", value: "", type: "default", enabled: true },
    { key: "icmsTaxationId", value: "", type: "default", enabled: true },
    { key: "pisCofinsSituationId", value: "", type: "default", enabled: true },
    { key: "productGroupId", value: "", type: "default", enabled: true },
    { key: "productSubgroupId", value: "", type: "default", enabled: true },
    { key: "productBrandId", value: "", type: "default", enabled: true },
    { key: "priceId", value: "", type: "default", enabled: true },
    { key: "promotionalPriceId", value: "", type: "default", enabled: true },
    { key: "stockSectorId", value: "", type: "default", enabled: true },
    { key: "stockLocationId", value: "", type: "default", enabled: true },
    { key: "stockBatchId", value: "", type: "default", enabled: true },
    { key: "stockBatchBalanceId", value: "", type: "default", enabled: true },
    { key: "stockSectorRentalId", value: "", type: "default", enabled: true },
    { key: "stockMinMaxId", value: "", type: "default", enabled: true },
    { key: "stockMovementId", value: "", type: "default", enabled: true },
    { key: "paymentTypeId", value: "", type: "default", enabled: true },
    { key: "saleId", value: "", type: "default", enabled: true },
    { key: "saleItemId", value: "", type: "default", enabled: true },
    { key: "salesReturnId", value: "", type: "default", enabled: true },
    { key: "typeNetworkId", value: "", type: "default", enabled: true },
    { key: "typeSupplierCustomerId", value: "", type: "default", enabled: true },
    { key: "contactId", value: "", type: "default", enabled: true },
    { key: "jwtIssuer", value: "gescom_api", type: "default", enabled: true },
    { key: "jwtAudience", value: "gescom_web_app", type: "default", enabled: true },
  ],
  _postman_variable_scope: "environment",
};

const testEnvironment = {
  ...environment,
  id: "gescom-local-supabase-test",
  name: "Gescom API - Local + Supabase (Teste)",
  values: environment.values.map((v) =>
    v.key === "supabaseEnv"
      ? { ...v, value: "test" }
      : v.key === "supabaseProjectRef"
        ? { ...v, value: "ytunacsixoenbomtzkte" }
        : v,
  ),
};

const collectionPath = join(__dirname, "gescom-api-complete.postman_collection.json");
const envProdPath = join(__dirname, "gescom-api-local-supabase.postman_environment.json");
const envTestPath = join(__dirname, "gescom-api-local-supabase-test.postman_environment.json");

writeFileSync(collectionPath, JSON.stringify(collection, null, 2), "utf8");
writeFileSync(envProdPath, JSON.stringify(environment, null, 2), "utf8");
writeFileSync(envTestPath, JSON.stringify(testEnvironment, null, 2), "utf8");

function countRequests(items) {
  let n = 0;
  for (const item of items) {
    if (item.request) n++;
    if (item.item) n += countRequests(item.item);
  }
  return n;
}

console.log(`Collection gerada: ${collectionPath}`);
console.log(`Environment produção: ${envProdPath}`);
console.log(`Environment teste: ${envTestPath}`);
console.log(`Total de requests: ${countRequests(collection.item)}`);
