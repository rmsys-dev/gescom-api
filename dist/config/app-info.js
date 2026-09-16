import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const readAppVersion = () => {
    try {
        const packageJsonPath = resolve(process.cwd(), "package.json");
        const packageJsonRaw = readFileSync(packageJsonPath, "utf-8");
        const packageJson = JSON.parse(packageJsonRaw);
        return packageJson.version?.trim() || "unknown";
    }
    catch {
        return "unknown";
    }
};
export const appInfo = {
    version: readAppVersion(),
};
