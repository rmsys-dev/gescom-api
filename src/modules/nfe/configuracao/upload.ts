import multer from "multer";
import { BadRequestError } from "../../../shared/errors/app-error.js";

const PFX_MAX_BYTES = 256 * 1024;

export const nfePfxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PFX_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.toLowerCase();
    if (name.endsWith(".pfx") || name.endsWith(".p12")) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestError(
        "Arquivo do certificado deve ser .pfx ou .p12",
        "NFE_CERT_FILE_INVALID",
      ),
    );
  },
}).single("pfx");
