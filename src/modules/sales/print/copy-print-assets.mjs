import { cpSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = dirname(fileURLToPath(import.meta.url));
const destDir = join(
  process.cwd(),
  "dist",
  "modules",
  "sales",
  "print",
  "assets",
);
mkdirSync(destDir, { recursive: true });
copyFileSync(join(srcDir, "assets", "logo.jpg"), join(destDir, "logo.jpg"));

const schemaSrc = join(
  process.cwd(),
  "src",
  "modules",
  "nfe",
  "sefaz",
  "schemas",
);
const schemaDest = join(process.cwd(), "dist", "modules", "nfe", "sefaz", "schemas");
cpSync(schemaSrc, schemaDest, { recursive: true });
