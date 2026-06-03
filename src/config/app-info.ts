import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type PackageJson = {
  version?: string;
};

const readAppVersion = (): string => {
  try {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJsonRaw = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonRaw) as PackageJson;

    return packageJson.version?.trim() || "unknown";
  } catch {
    return "unknown";
  }
};

export const appInfo = {
  version: readAppVersion(),
};
