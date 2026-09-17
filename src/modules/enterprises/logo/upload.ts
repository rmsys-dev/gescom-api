import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  PayloadTooLargeError,
  ValidationError,
} from "../../../shared/errors/app-error.js";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LOGO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIMES)[number];

const mimeSet = new Set<string>(ALLOWED_LOGO_MIMES);

const detectLogoMime = (buffer: Buffer): AllowedLogoMime | null => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

/** Valida magic bytes e alinha com o Content-Type declarado (quando presente). */
export const resolveLogoMime = (
  declaredMime: string | undefined,
  buffer: Buffer,
): AllowedLogoMime => {
  const detected = detectLogoMime(buffer);
  if (!detected) {
    throw new ValidationError(
      [
        {
          path: "logo",
          message: "Arquivo deve ser JPEG, PNG ou WebP",
        },
      ],
      "Tipo de arquivo invalido",
    );
  }

  const normalized = (declaredMime ?? "").toLowerCase().trim();
  if (!normalized) return detected;

  const declaredJpeg =
    normalized === "image/jpeg" || normalized === "image/jpg";
  if (detected === "image/jpeg" && declaredJpeg) return detected;
  if (normalized === detected) return detected;

  if (mimeSet.has(normalized) || declaredJpeg) {
    throw new ValidationError(
      [
        {
          path: "logo",
          message: "Content-Type nao corresponde ao conteudo do arquivo",
        },
      ],
      "Tipo de arquivo invalido",
    );
  }

  // Content-Type desconhecido: confia no conteúdo detectado.
  return detected;
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: LOGO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    if (mimeSet.has(mime) || mime === "image/jpg") {
      cb(null, true);
      return;
    }
    cb(
      new ValidationError(
        [
          {
            path: "logo",
            message: "Arquivo deve ser JPEG, PNG ou WebP",
          },
        ],
        "Tipo de arquivo invalido",
      ),
    );
  },
});

export type RequestWithLogoFile = Request & {
  file?: Express.Multer.File;
};

/** Middleware multer para o campo multipart `logo`. */
export const uploadEnterpriseLogo = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  upload.single("logo")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new PayloadTooLargeError("Logo excede o limite de 2 MB"));
      return;
    }
    if (err instanceof multer.MulterError) {
      next(
        new ValidationError(
          [{ path: "logo", message: err.message }],
          "Arquivo invalido",
        ),
      );
      return;
    }
    next(err);
  });
};
