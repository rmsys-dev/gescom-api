import { EXTRA_DEPARTMENTS } from "../lib/constants.js";
import { ensureDepartment } from "../lib/department-helpers.js";

export async function seedExtraDepartments(): Promise<Map<string, string>> {
  console.log(`Seed departamentos extras (${String(EXTRA_DEPARTMENTS.length)})...`);

  const ids = new Map<string, string>();

  for (const dept of EXTRA_DEPARTMENTS) {
    const id = await ensureDepartment(dept);
    ids.set(dept.name, id);
  }

  console.log("Departamentos extras concluidos.");
  return ids;
}
