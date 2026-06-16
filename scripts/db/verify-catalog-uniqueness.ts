import "dotenv/config";
import { productBrandsService } from "../../src/modules/products/product-brands/service.js";
import { productGroupsService } from "../../src/modules/products/product-groups/service.js";
import { productSubgroupsService } from "../../src/modules/products/product-subgroups/service.js";
import { db, enterprises } from "../../src/db/schema.js";
import { ConflictError } from "../../src/shared/errors/app-error.js";

const audit = {
  userId: "00000000-0000-0000-0000-000000000001",
  userLegalName: "catalog-uniqueness-verify",
  ipAddress: "127.0.0.1",
  userAgent: "verify-script",
  source: "scripts/db/verify-catalog-uniqueness.ts",
} as const;

const suffix = Date.now().toString(36).toUpperCase();
const description = `UNIQ_TEST_${suffix}`;

const enterpriseRow = (await db.select({ id: enterprises.id }).from(enterprises).limit(1))[0];
if (!enterpriseRow) {
  throw new Error("Nenhuma empresa encontrada para o teste.");
}
const enterpriseId = enterpriseRow.id;

const assertDuplicateRejected = async (
  label: string,
  create: (desc: string) => Promise<unknown>,
  cleanup: (id: string) => Promise<unknown>,
) => {
  const created = (await create(description)) as { id: string };
  try {
    await create(description);
    throw new Error(`${label}: duplicata deveria retornar conflito`);
  } catch (err) {
    if (!(err instanceof ConflictError)) {
      throw err;
    }
  } finally {
    await cleanup(created.id);
  }
  console.log(`OK: ${label}`);
};

await assertDuplicateRejected(
  "product-groups",
  (desc) => productGroupsService.create(enterpriseId, { description: desc }, audit),
  (id) => productGroupsService.delete(enterpriseId, id, audit),
);

await assertDuplicateRejected(
  "product-brands",
  (desc) => productBrandsService.create(enterpriseId, { description: desc }, audit),
  (id) => productBrandsService.delete(enterpriseId, id, audit),
);

await assertDuplicateRejected(
  "product-subgroups",
  (desc) => productSubgroupsService.create(enterpriseId, { description: desc }, audit),
  (id) => productSubgroupsService.delete(enterpriseId, id, audit),
);

console.log("Verificacao de unicidade concluida com sucesso.");
