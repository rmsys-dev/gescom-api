import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const logoCandidates = (): string[] => {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, "assets", "logo.jpg"),
    join(
      process.cwd(),
      "src",
      "modules",
      "sales",
      "print",
      "assets",
      "logo.jpg",
    ),
    join(process.cwd(), "logo.jpg"),
  ];
};

export const loadPrintLogoSrc = (): string | null => {
  for (const path of logoCandidates()) {
    if (!existsSync(path)) continue;
    return `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
  }
  return null;
};
