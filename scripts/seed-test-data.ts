/**
 * Orquestrador de dados de teste (idempotente).
 *
 * Mantem um unico usuario com credenciais (bootstrap) e popula volume maior
 * de usuarios sem credenciais, departamentos, enderecos, produtos, estoque e vendas.
 *
 * Uso: `npm run seed:test-data`
 *
 * Pre-requisitos: `.env` com `DATABASE_URL`.
 *
 * Etapas:
 * 1. Bootstrap (admin + empresa + departamento Administrativo)
 * 2. Departamentos extras
 * 3. Usuarios ficticios (sem credenciais)
 * 4. Enderecos (Brasil, estados, cidades, CEPs — insercao direta DB)
 * 5. Membros + perfis parciais de usuario
 * 6. Catalogo de produtos
 * 7. Estoque
 * 8. Vendas e orcamentos
 *
 * Scripts legados continuam disponiveis individualmente:
 * - seed:bootstrap, seed:fictitious-users, seed:fictitious-addresses (via API maintainer)
 * - seed:enterprise-switch-test
 */
import "dotenv/config";
import { runBootstrapSeed } from "./seed-bootstrap.js";
import { seedExtraDepartments } from "./seed/modules/departments.js";
import { seedFictitiousUsers } from "./seed/modules/fictitious-users.js";
import { seedAddressesDirect } from "./seed/modules/addresses.js";
import { seedMembers } from "./seed/modules/members.js";
import { seedUserProfiles } from "./seed/modules/user-profiles.js";
import { seedProductCatalog } from "./seed/modules/product-catalog.js";
import { seedStock } from "./seed/modules/stock.js";
import { seedSales } from "./seed/modules/sales.js";

async function main(): Promise<void> {
  console.log("=== Seed test-data: inicio ===\n");

  console.log("[1/8] Bootstrap...");
  await runBootstrapSeed();
  console.log("");

  console.log("[2/8] Departamentos extras...");
  await seedExtraDepartments();
  console.log("");

  console.log("[3/8] Usuarios ficticios...");
  await seedFictitiousUsers();
  console.log("");

  console.log("[4/8] Enderecos...");
  const addressRefs = await seedAddressesDirect();
  console.log("");

  console.log("[5/8] Membros e perfis...");
  await seedMembers();
  await seedUserProfiles(addressRefs);
  console.log("");

  console.log("[6/8] Catalogo de produtos...");
  const catalog = await seedProductCatalog();
  console.log("");

  console.log("[7/8] Estoque...");
  await seedStock(catalog);
  console.log("");

  console.log("[8/8] Vendas...");
  await seedSales(catalog);
  console.log("");

  console.log("=== Seed test-data: concluido ===");
  console.log(
    "Credenciais de login: unico usuario admin do bootstrap (seed:bootstrap).",
  );
  console.log(
    "Opcional: npm run seed:enterprise-switch-test para segunda empresa do admin.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
