import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { photoFilePath } from "../../../shared/photos/photo-storage.js";

const LOGO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

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

const fileDataUri = (path: string): string | null => {
  const mime = LOGO_MIME[extname(path).toLowerCase()];
  if (!mime || !existsSync(path)) return null;
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
};

/** Só o logo gravado na empresa (`logoUrl`), sem o padrão do sistema. */
export const loadEnterpriseLogoSrc = (logoUrl?: string | null): string | null => {
  const enterpriseLogo = photoFilePath(logoUrl);
  return enterpriseLogo ? fileDataUri(enterpriseLogo) : null;
};

/** Logo da empresa (`logoUrl`); sem ele, usa o logo padrão do sistema. */
export const loadPrintLogoSrc = (logoUrl?: string | null): string | null => {
  const src = loadEnterpriseLogoSrc(logoUrl);
  if (src) return src;
  for (const path of logoCandidates()) {
    const src = fileDataUri(path);
    if (src) return src;
  }
  return null;
};
