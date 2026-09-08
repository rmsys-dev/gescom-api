import { copyFileSync, mkdirSync } from "node:fs";
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
