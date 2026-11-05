import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("Defina DATABASE_URL para carregar o seed.");
  process.exit(1);
}

const SEEDED = [
  "countries",
  "states",
  "cities",
  "ceps",
  "enterprise_groups",
  "enterprises",
  "users",
  "enterprises_members",
  "products",
  "sales",
  "financial_titles",
];

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.begin(async (tx) => {
    const [country] = await tx<{ id: string }[]>`
      INSERT INTO countries (
        country_code, country_name, cbs_tax, is_tax, ibs_uf_tax, ibs_municipal_tax
      ) VALUES ('1058', 'Brasil', 0, 0, 0, 0)
      RETURNING id
    `;
    const [state] = await tx<{ id: string }[]>`
      INSERT INTO states (
        acronym, description, internal_aliquot, interstate_aliquot, fcp_aliquot,
        ibs_uf_tax, ibs_municipal_tax, country_id
      ) VALUES ('SP', 'Sao Paulo', 18, 12, 0, 0, 0, ${country?.id ?? ""})
      RETURNING id
    `;
    const [city] = await tx<{ id: string }[]>`
      INSERT INTO cities (ibge_code, city_name, ibs_municipal_tax, state_id)
      VALUES (3550308, 'Sao Paulo', 0, ${state?.id ?? ""})
      RETURNING id
    `;
    await tx`
      INSERT INTO ceps (cep_number, address, neighborhood, city_id)
      VALUES ('01001000', 'Praca da Se', 'Se', ${city?.id ?? ""})
    `;
    const [group] = await tx<{ id: string }[]>`
      INSERT INTO enterprise_groups (name) VALUES ('Grupo Seed') RETURNING id
    `;
    const [enterprise] = await tx<{ id: string }[]>`
      INSERT INTO enterprises (registration, legal_name, trade_name, group_id)
      VALUES ('12345678000199', 'Empresa Seed LTDA', 'Seed', ${group?.id ?? null})
      RETURNING id
    `;
    const [user] = await tx<{ id: string }[]>`
      INSERT INTO users (user_name) VALUES ('Seed') RETURNING id
    `;
    const [member] = await tx<{ id: string }[]>`
      INSERT INTO enterprises_members (class, user_id, enterprise_id, included_by)
      VALUES ('CLIENTE', ${user?.id ?? ""}, ${enterprise?.id ?? ""}, ${user?.id ?? ""})
      RETURNING id
    `;
    await tx`
      INSERT INTO products (description) VALUES ('Produto seed')
    `;
    await tx`
      INSERT INTO sales (
        order_number, user_id, user_legal_name, seller_id, seller_legal_name,
        member_id, type, sub_total, status, enterprises_id
      ) VALUES (
        1, ${user?.id ?? ""}, 'Seed', ${user?.id ?? ""}, 'Seed',
        ${member?.id ?? ""}, 'VENDA', 10.00, 'ABERTA', ${enterprise?.id ?? ""}
      )
    `;
    await tx`
      INSERT INTO financial_titles (
        enterprise_id, direction, source, kind, number, member_id,
        issue_date, original_amount, open_amount
      ) VALUES (
        ${enterprise?.id ?? ""}, 'RECEBER', 'VENDA', 'AVULSO', 1, ${member?.id ?? ""},
        CURRENT_DATE, 10.00, 10.00
      )
    `;
  });

  const rows = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const seeded = new Set(SEEDED);
  const missing = rows.map((row) => row.table_name).filter((name) => !seeded.has(name));
  console.log(`[seed] com dados: ${SEEDED.join(", ")}`);
  console.log(`[seed] sem seed (${missing.length}): ${missing.join(", ")}`);
} finally {
  await sql.end();
}
