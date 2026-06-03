/**
 * Cria hierarquia de endereços no Brasil via rotas maintainer:
 * 1 país (Brasil) → 5 estados → 5 cidades → 5 CEPs.
 *
 * Uso: `npm run seed:fictitious-addresses` ou `npx tsx scripts/seed-fictitious-addresses.ts`
 *
 * Pré-requisitos:
 * - API em execução (`npm run dev`)
 * - `.env` com `MAINTAINER_API_KEY`, `PORT` (ou `API_BASE_URL`) e `DATABASE_URL`
 *
 * Reexecução: se o Brasil (BR) já existir, o script reutiliza o registro no banco.
 * Estados, cidades e CEPs usam códigos/IBGE fixos — conflito retorna 409.
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { env } from "../src/config/env.js";
import { db } from "../src/db/index.js";
import { countries } from "../src/db/schema.js";
import { MAINTAINER_API_KEY_HEADER } from "../src/modules/maintainer/shared/require-maintainer-api-key.js";

const API_BASE_URL =
  process.env.API_BASE_URL?.trim() ||
  `http://localhost:${String(env.PORT)}`;

type JsonRecord = Record<string, unknown>;

const BRAZIL_COUNTRY = {
  countryCode: "BR",
  countryName: "Brasil",
  cbsTax: 0,
  isTax: 0,
  ibs_uf_tax: 0,
  ibs_municipal_tax: 0,
} as const;

type BrazilLocationSeed = {
  label: string;
  state: {
    acronym: string;
    description: string;
    internalAliquot: number;
    interstateAliquot: number;
    fcpAliquot: number;
    borders: number;
    embedTax: boolean;
    ibs_uf_tax: number;
    ibs_municipal_tax: number;
  };
  city: {
    ibgeCode: number;
    citieName: string;
    citieCode: string;
    citieDigit: number;
    ibs_municipal_tax: number;
  };
  cep: {
    cepNumber: string;
    address: string;
    number: string;
    complement?: string;
    neighborhood: string;
  };
};

/** Estados e capitais reais; CEPs de logradouros conhecidos em cada cidade. */
const BRAZIL_LOCATIONS: BrazilLocationSeed[] = [
  {
    label: "Sao Paulo - SP",
    state: {
      acronym: "SP",
      description: "Sao Paulo",
      internalAliquot: 18,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 3550308,
      citieName: "Sao Paulo",
      citieCode: "01",
      citieDigit: 1,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "01310100",
      address: "Avenida Paulista",
      number: "1578",
      complement: "Andar 10",
      neighborhood: "Bela Vista",
    },
  },
  {
    label: "Rio de Janeiro - RJ",
    state: {
      acronym: "RJ",
      description: "Rio de Janeiro",
      internalAliquot: 20,
      interstateAliquot: 12,
      fcpAliquot: 2,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 3304557,
      citieName: "Rio de Janeiro",
      citieCode: "02",
      citieDigit: 2,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "20040020",
      address: "Praca Maua",
      number: "1",
      neighborhood: "Centro",
    },
  },
  {
    label: "Belo Horizonte - MG",
    state: {
      acronym: "MG",
      description: "Minas Gerais",
      internalAliquot: 18,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 3106200,
      citieName: "Belo Horizonte",
      citieCode: "03",
      citieDigit: 3,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "30130100",
      address: "Avenida Afonso Pena",
      number: "1500",
      neighborhood: "Centro",
    },
  },
  {
    label: "Curitiba - PR",
    state: {
      acronym: "PR",
      description: "Parana",
      internalAliquot: 19.5,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 4106902,
      citieName: "Curitiba",
      citieCode: "04",
      citieDigit: 4,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "80010000",
      address: "Rua XV de Novembro",
      number: "100",
      neighborhood: "Centro",
    },
  },
  {
    label: "Porto Alegre - RS",
    state: {
      acronym: "RS",
      description: "Rio Grande do Sul",
      internalAliquot: 17,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 1,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 4314902,
      citieName: "Porto Alegre",
      citieCode: "05",
      citieDigit: 5,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "90010000",
      address: "Rua dos Andradas",
      number: "1001",
      complement: "Sala 201",
      neighborhood: "Centro Historico",
    },
  },
];

type MaintainerPostResult = {
  ok: boolean;
  status: number;
  payload: JsonRecord;
};

async function maintainerPost(
  path: string,
  body: JsonRecord,
): Promise<MaintainerPostResult> {
  const url = `${API_BASE_URL}/api/v1/maintainer${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [MAINTAINER_API_KEY_HEADER]: env.MAINTAINER_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: JsonRecord = {};
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as JsonRecord;
    } catch {
      payload = { raw: text };
    }
  }

  return { ok: response.ok, status: response.status, payload };
}

function formatPostError(path: string, result: MaintainerPostResult): string {
  const detail =
    typeof result.payload.message === "string"
      ? result.payload.message
      : JSON.stringify(result.payload);
  return `POST ${path} falhou (${String(result.status)}): ${detail}`;
}

function requireId(payload: JsonRecord, resource: string): string {
  const data = payload.data;
  const record =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as JsonRecord)
      : payload;
  const id = record.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Resposta de ${resource} sem campo id`);
  }
  return id;
}

async function findBrazilCountryId(): Promise<string | null> {
  const rows = await db
    .select({ id: countries.id })
    .from(countries)
    .where(and(eq(countries.countryCode, "BR"), isNull(countries.deletedAt)))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function ensureBrazilCountryId(): Promise<string> {
  const result = await maintainerPost("/countries", { ...BRAZIL_COUNTRY });

  if (result.ok) {
    const id = requireId(result.payload, "pais");
    console.log(`Pais criado: ${id} (BR - Brasil)`);
    return id;
  }

  if (result.status === 409) {
    const existingId = await findBrazilCountryId();
    if (existingId) {
      console.log(`Pais ja existe: ${existingId} (BR - Brasil)`);
      return existingId;
    }
  }

  throw new Error(formatPostError("/countries", result));
}

async function assertApiReachable(): Promise<void> {
  const healthUrl = `${API_BASE_URL}/health`;
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) {
      throw new Error(`status ${String(response.status)}`);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `API indisponivel em ${API_BASE_URL} (${reason}). Inicie com npm run dev.`,
    );
  }
}

async function seedBrazilLocation(
  countryId: string,
  location: BrazilLocationSeed,
): Promise<void> {
  console.log(`\n--- ${location.label} ---`);

  const stateResult = await maintainerPost("/states", {
    ...location.state,
    countryId,
  });
  if (!stateResult.ok) {
    throw new Error(formatPostError("/states", stateResult));
  }
  const stateId = requireId(stateResult.payload, "estado");
  console.log(
    `  Estado criado: ${stateId} (${location.state.acronym} - ${location.state.description})`,
  );

  const cityResult = await maintainerPost("/cities", {
    ...location.city,
    stateId,
  });
  if (!cityResult.ok) {
    throw new Error(formatPostError("/cities", cityResult));
  }
  const cityId = requireId(cityResult.payload, "cidade");
  console.log(`  Cidade criada: ${cityId} (${location.city.citieName})`);

  const cepResult = await maintainerPost("/ceps", {
    ...location.cep,
    cityId,
  });
  if (!cepResult.ok) {
    throw new Error(formatPostError("/ceps", cepResult));
  }
  const cepId = requireId(cepResult.payload, "CEP");
  console.log(
    `  CEP criado: ${cepId} (${location.cep.cepNumber} - ${location.cep.address})`,
  );
}

async function seed(): Promise<void> {
  console.log(
    `Iniciando seed: Brasil + ${String(BRAZIL_LOCATIONS.length)} estados/cidades/CEPs via API...`,
  );
  console.log(`Base URL: ${API_BASE_URL}`);

  await assertApiReachable();

  const countryId = await ensureBrazilCountryId();

  for (const location of BRAZIL_LOCATIONS) {
    await seedBrazilLocation(countryId, location);
  }

  console.log("\nSeed de enderecos (Brasil) concluido.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
