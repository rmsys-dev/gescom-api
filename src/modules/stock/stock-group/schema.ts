import { z } from "zod";
import { optionalTrimmedStringSchema } from "../../../shared/validation/common-schemas.js";

const uuidListSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const ids = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return ids.length > 0 ? ids : undefined;
  },
  z
    .array(z.string().uuid("Campo 'enterpriseIds' deve conter UUIDs validos"))
    .max(50)
    .optional(),
);

export const listStockGroupQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    productId: z.string().uuid("Campo 'productId' deve ser um UUID valido").optional(),
    barCode: optionalTrimmedStringSchema("barCode", 255),
    search: optionalTrimmedStringSchema("search", 255),
    enterpriseIds: uuidListSchema,
  })
  .strict();

export type ListStockGroupQuery = z.infer<typeof listStockGroupQuerySchema>;
