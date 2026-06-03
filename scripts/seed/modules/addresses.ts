import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  ceps,
  cities,
  countries,
  states,
} from "../../../src/db/schema.js";

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

const BRAZIL_COUNTRY = {
  countryCode: "BR",
  countryName: "Brasil",
  cbsTax: "0",
  isTax: "0",
  ibs_uf_tax: "0",
  ibs_municipal_tax: "0",
} as const;

/** Estados/capitais reais + CEPs ficticios para testes (insercao direta no banco). */
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
  {
    label: "Salvador - BA",
    state: {
      acronym: "BA",
      description: "Bahia",
      internalAliquot: 19,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 2927408,
      citieName: "Salvador",
      citieCode: "06",
      citieDigit: 6,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "40020000",
      address: "Praca da Se",
      number: "50",
      neighborhood: "Centro",
    },
  },
  {
    label: "Recife - PE",
    state: {
      acronym: "PE",
      description: "Pernambuco",
      internalAliquot: 18,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 2611606,
      citieName: "Recife",
      citieCode: "07",
      citieDigit: 7,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "50010000",
      address: "Rua do Bom Jesus",
      number: "200",
      neighborhood: "Recife Antigo",
    },
  },
  {
    label: "Fortaleza - CE",
    state: {
      acronym: "CE",
      description: "Ceara",
      internalAliquot: 18,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 2304400,
      citieName: "Fortaleza",
      citieCode: "08",
      citieDigit: 8,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "60165081",
      address: "Avenida Beira Mar",
      number: "3000",
      neighborhood: "Meireles",
    },
  },
  {
    label: "Brasilia - DF",
    state: {
      acronym: "DF",
      description: "Distrito Federal",
      internalAliquot: 18,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 5300108,
      citieName: "Brasilia",
      citieCode: "09",
      citieDigit: 9,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "70040902",
      address: "Esplanada dos Ministerios",
      number: "S/N",
      neighborhood: "Zona Civico-Administrativa",
    },
  },
  {
    label: "Goiania - GO",
    state: {
      acronym: "GO",
      description: "Goias",
      internalAliquot: 17,
      interstateAliquot: 12,
      fcpAliquot: 0,
      borders: 0,
      embedTax: false,
      ibs_uf_tax: 0,
      ibs_municipal_tax: 0,
    },
    city: {
      ibgeCode: 5208707,
      citieName: "Goiania",
      citieCode: "10",
      citieDigit: 0,
      ibs_municipal_tax: 0,
    },
    cep: {
      cepNumber: "74015010",
      address: "Avenida Goias",
      number: "800",
      neighborhood: "Centro",
    },
  },
];

export type AddressSeedRefs = {
  countryId: string;
  cepIds: string[];
  locations: Array<{
    label: string;
    stateId: string;
    cityId: string;
    cepId: string;
  }>;
};

async function ensureBrazilCountryId(): Promise<string> {
  const existing = await db
    .select({ id: countries.id })
    .from(countries)
    .where(and(eq(countries.countryCode, "BR"), isNull(countries.deletedAt)))
    .limit(1);

  if (existing[0]) {
    console.log(`Pais ja existe: ${existing[0].id} (BR)`);
    return existing[0].id;
  }

  const [row] = await db.insert(countries).values(BRAZIL_COUNTRY).returning();
  console.log(`Pais criado: ${row!.id} (BR)`);
  return row!.id;
}

async function ensureState(
  countryId: string,
  location: BrazilLocationSeed,
): Promise<string> {
  const existing = await db
    .select({ id: states.id })
    .from(states)
    .where(
      and(
        eq(states.countryId, countryId),
        eq(states.acronym, location.state.acronym),
        isNull(states.deletedAt),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const [row] = await db
    .insert(states)
    .values({
      ...location.state,
      internalAliquot: String(location.state.internalAliquot),
      interstateAliquot: String(location.state.interstateAliquot),
      fcpAliquot: String(location.state.fcpAliquot),
      ibs_uf_tax: String(location.state.ibs_uf_tax),
      ibs_municipal_tax: String(location.state.ibs_municipal_tax),
      countryId,
    })
    .returning();

  console.log(`  Estado criado: ${location.state.acronym}`);
  return row!.id;
}

async function ensureCity(
  stateId: string,
  location: BrazilLocationSeed,
): Promise<string> {
  const existing = await db
    .select({ id: cities.id })
    .from(cities)
    .where(
      and(eq(cities.ibgeCode, location.city.ibgeCode), isNull(cities.deletedAt)),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const [row] = await db
    .insert(cities)
    .values({
      ...location.city,
      ibs_municipal_tax: String(location.city.ibs_municipal_tax),
      stateId,
    })
    .returning();

  console.log(`  Cidade criada: ${location.city.citieName}`);
  return row!.id;
}

async function ensureCep(
  cityId: string,
  location: BrazilLocationSeed,
): Promise<string> {
  const existing = await db
    .select({ id: ceps.id })
    .from(ceps)
    .where(
      and(
        eq(ceps.cityId, cityId),
        eq(ceps.cepNumber, location.cep.cepNumber),
        isNull(ceps.deletedAt),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const [row] = await db
    .insert(ceps)
    .values({ ...location.cep, cityId })
    .returning();

  console.log(`  CEP criado: ${location.cep.cepNumber}`);
  return row!.id;
}

export async function seedAddressesDirect(): Promise<AddressSeedRefs> {
  console.log(
    `Seed enderecos (Brasil + ${String(BRAZIL_LOCATIONS.length)} localidades via DB)...`,
  );

  const countryId = await ensureBrazilCountryId();
  const cepIds: string[] = [];
  const locations: AddressSeedRefs["locations"] = [];

  for (const location of BRAZIL_LOCATIONS) {
    console.log(`--- ${location.label} ---`);
    const stateId = await ensureState(countryId, location);
    const cityId = await ensureCity(stateId, location);
    const cepId = await ensureCep(cityId, location);
    cepIds.push(cepId);
    locations.push({
      label: location.label,
      stateId,
      cityId,
      cepId,
    });
  }

  console.log("Seed enderecos concluido.");
  return { countryId, cepIds, locations };
}
