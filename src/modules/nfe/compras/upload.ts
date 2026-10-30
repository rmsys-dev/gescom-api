import multer from "multer";
import { BadRequestError } from "../../../shared/errors/app-error.js";

const XML_MAX_BYTES = 5 * 1024 * 1024;

export const nfeCompraXmlUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: XML_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.toLowerCase();
    if (name.endsWith(".xml")) {
      callback(null, true);
      return;
    }
    callback(
      new BadRequestError(
        "Envie o procNFe do fornecedor no arquivo .xml",
        "NFE_COMPRA_XML_INVALID",
      ),
    );
  },
}).single("xml");
