import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { env } from "../../config/env.js";
import { BadRequestError } from "../errors/app-error.js";

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const NAME_MAX = 60;

const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PhotoFolder = "membros" | "produtos" | "empresas";

export type PhotoFile = {
  buffer: Buffer;
  mimetype: string;
};

/** Nome sem acento, em minúsculas, com hífens e no máximo 60 caracteres. */
export const slugPhotoName = (name: string): string => {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, NAME_MAX)
    .replace(/-+$/g, "");
  return slug || "sem-nome";
};

export const photoFileName = (id: string, name: string, mimetype: string): string => {
  const extension = PHOTO_EXTENSIONS[mimetype];
  if (!extension) {
    throw new BadRequestError(
      "Foto deve ser jpeg, png ou webp",
      "PHOTO_FILE_INVALID",
    );
  }
  return `${id}-${slugPhotoName(name)}.${extension}`;
};

const photosRoot = (rootDir?: string): string =>
  path.resolve(rootDir ?? env.PHOTOS_DIR);

export const savePhoto = async (input: {
  folder: PhotoFolder;
  id: string;
  name: string;
  file: PhotoFile;
  rootDir?: string;
}): Promise<string> => {
  const fileName = photoFileName(input.id, input.name, input.file.mimetype);
  const folder = path.join(photosRoot(input.rootDir), input.folder);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, fileName), input.file.buffer);
  return `/fotos/${input.folder}/${fileName}`;
};

/** Caminho do arquivo da URL, só quando ele está dentro da pasta de fotos. */
export const photoFilePath = (
  url: string | null | undefined,
  rootDir?: string,
): string | null => {
  if (!url || !url.startsWith("/fotos/")) return null;
  const relative = url.slice("/fotos/".length);
  if (!relative || relative.includes("..")) return null;
  const root = photosRoot(rootDir);
  const filePath = path.resolve(root, relative);
  const fromRoot = path.relative(root, filePath);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) return null;
  return filePath;
};

/** Apaga o arquivo da URL, só quando ele está dentro da pasta de fotos. */
export const removePhoto = async (
  url: string | null | undefined,
  rootDir?: string,
): Promise<void> => {
  const filePath = photoFilePath(url, rootDir);
  if (!filePath) return;
  await rm(filePath, { force: true });
};

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (PHOTO_EXTENSIONS[file.mimetype]) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestError(
        "Foto deve ser jpeg, png ou webp",
        "PHOTO_FILE_INVALID",
      ),
    );
  },
}).single("foto");
