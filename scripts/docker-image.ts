/**
 * Tag da imagem local: versão do package.json + SHA curto do commit.
 * Árvore com alteração não commitada ganha um sufixo extra, para não
 * reaproveitar a imagem do commit limpo. Não grava tag latest.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tagFile = path.join(root, ".docker-image-tag");
const imageName = "gescom-api";

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

export function imageTag(version: string, sha: string, dirtyAt: number | null): string {
  if (!VERSION.test(version)) {
    throw new Error(`Versão inválida em package.json: "${version}". Use semver sem metadado de build (+).`);
  }
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    throw new Error(`SHA curto inválido: "${sha}".`);
  }
  if (dirtyAt !== null && (!Number.isInteger(dirtyAt) || dirtyAt < 0)) {
    throw new Error("Instante da árvore suja inválido.");
  }
  const suffix = dirtyAt === null ? sha : `${sha}-dirty-${dirtyAt}`;
  const tag = `${version}-${suffix}`;
  if (tag.length > 128 || tag === "latest") {
    throw new Error(`Tag de imagem inválida: "${tag}".`);
  }
  return tag;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as { version?: unknown };
  return typeof pkg.version === "string" ? pkg.version.trim() : "";
}

function currentTag(): string {
  const sha = git(["rev-parse", "--short", "HEAD"]);
  const dirty = git(["status", "--porcelain"]).length > 0;
  return imageTag(readVersion(), sha, dirty ? Date.now() : null);
}

function readSavedTag(): string {
  let tag: string;
  try {
    tag = readFileSync(tagFile, "utf8").trim();
  } catch {
    throw new Error("Rode npm run docker:build antes. O arquivo .docker-image-tag não existe.");
  }
  if (!tag || tag === "latest" || !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag)) {
    throw new Error(`Tag salva inválida em .docker-image-tag: "${tag}". Rode npm run docker:build de novo.`);
  }
  return tag;
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function main(): void {
  const action = process.argv[2];
  if (action === "build") {
    const tag = currentTag();
    const image = `${imageName}:${tag}`;
    run("docker", ["build", "-t", image, "."]);
    writeFileSync(tagFile, `${tag}\n`);
    console.log(`[docker] Imagem: ${image}`);
    return;
  }
  if (action === "run") {
    const image = `${imageName}:${readSavedTag()}`;
    run("docker", [
      "run",
      "--rm",
      "-p",
      "3000:3000",
      "--memory=768m",
      "--shm-size=1g",
      "-v",
      "gescom-fotos:/app/fotos",
      "-v",
      "gescom-storage:/app/storage",
      "--env-file",
      ".env.docker",
      image,
    ]);
    return;
  }
  throw new Error("Uso: tsx scripts/docker-image.ts build|run");
}

const entry = process.argv[1];
if (entry && path.resolve(entry).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try {
    main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "erro interno";
    console.error(`[docker] ${message}`);
    process.exit(1);
  }
}
