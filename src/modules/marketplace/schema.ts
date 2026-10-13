import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug deve ser kebab-case (ex.: produto-azul)",
  );

const atLeastOneField = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.strict().refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const listListingsQuerySchema = createPaginationQuerySchema(100).extend({
  search: z.string().trim().max(255).optional(),
});

export const listingIdParamsSchema = z
  .object({
    listingId: uuidSchema("listingId"),
  })
  .strict();

export const characteristicIdParamsSchema = z
  .object({
    characteristicId: uuidSchema("characteristicId"),
  })
  .strict();

export const optionIdParamsSchema = z
  .object({
    optionId: uuidSchema("optionId"),
  })
  .strict();

export const optionValueIdParamsSchema = z
  .object({
    valueId: uuidSchema("valueId"),
  })
  .strict();

export const variantIdParamsSchema = z
  .object({
    variantId: uuidSchema("variantId"),
  })
  .strict();

export const photoIdParamsSchema = z
  .object({
    photoId: uuidSchema("photoId"),
  })
  .strict();

export const reviewIdParamsSchema = z
  .object({
    reviewId: uuidSchema("reviewId"),
  })
  .strict();

export const questionIdParamsSchema = z
  .object({
    questionId: uuidSchema("questionId"),
  })
  .strict();

export const createListingSchema = z
  .object({
    productsEnterprisesId: z.string().uuid(),
    slug: slugSchema,
    isPublished: z.boolean().optional().default(false),
    featured: z.boolean().optional().default(false),
    freeShipping: z.boolean().optional().default(false),
    sortOrder: z.coerce.number().int().optional().default(0),
    storeTitle: z.string().trim().max(255).nullable().optional(),
    storeDescription: z.string().trim().max(10000).nullable().optional(),
  })
  .strict();

export const patchListingSchema = atLeastOneField(
  z.object({
    slug: slugSchema.optional(),
    isPublished: z.boolean().optional(),
    featured: z.boolean().optional(),
    freeShipping: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    storeTitle: z.string().trim().max(255).nullable().optional(),
    storeDescription: z.string().trim().max(10000).nullable().optional(),
  }),
);

export const replaceCharacteristicsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(255),
            value: z.string().trim().min(1).max(500),
            sortOrder: z.coerce.number().int().optional().default(0),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export const createCharacteristicSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    value: z.string().trim().min(1).max(500),
    sortOrder: z.coerce.number().int().optional().default(0),
  })
  .strict();

export const patchCharacteristicSchema = atLeastOneField(
  z.object({
    name: z.string().trim().min(1).max(255).optional(),
    value: z.string().trim().min(1).max(500).optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
);

export const createVariantOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    sortOrder: z.coerce.number().int().optional().default(0),
  })
  .strict();

export const patchVariantOptionSchema = atLeastOneField(
  z.object({
    name: z.string().trim().min(1).max(255).optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
);

export const createVariantOptionValueSchema = z
  .object({
    value: z.string().trim().min(1).max(255),
    sortOrder: z.coerce.number().int().optional().default(0),
  })
  .strict();

export const patchVariantOptionValueSchema = atLeastOneField(
  z.object({
    value: z.string().trim().min(1).max(255).optional(),
    sortOrder: z.coerce.number().int().optional(),
  }),
);

export const createVariantSchema = z
  .object({
    sku: z.string().trim().max(100).nullable().optional(),
    productsEnterprisesId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().optional().default(0),
    optionValueIds: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const patchVariantSchema = atLeastOneField(
  z.object({
    sku: z.string().trim().max(100).nullable().optional(),
    productsEnterprisesId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    optionValueIds: z.array(z.string().uuid()).min(1).optional(),
  }),
);

export const uploadListingPhotoQuerySchema = z
  .object({
    sortOrder: z.coerce.number().int().optional(),
  })
  .strict();

export const patchListingPhotoSchema = z
  .object({
    sortOrder: z.coerce.number().int(),
  })
  .strict();

export const patchReviewSchema = z
  .object({
    isVisible: z.boolean(),
  })
  .strict();

export const patchQuestionSchema = z
  .object({
    answer: z.string().trim().min(1).max(5000).optional(),
    isVisible: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type PatchListingInput = z.infer<typeof patchListingSchema>;
export type ReplaceCharacteristicsInput = z.infer<
  typeof replaceCharacteristicsSchema
>;
export type CreateCharacteristicInput = z.infer<
  typeof createCharacteristicSchema
>;
export type PatchCharacteristicInput = z.infer<
  typeof patchCharacteristicSchema
>;
export type CreateVariantOptionInput = z.infer<
  typeof createVariantOptionSchema
>;
export type PatchVariantOptionInput = z.infer<typeof patchVariantOptionSchema>;
export type CreateVariantOptionValueInput = z.infer<
  typeof createVariantOptionValueSchema
>;
export type PatchVariantOptionValueInput = z.infer<
  typeof patchVariantOptionValueSchema
>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type PatchVariantInput = z.infer<typeof patchVariantSchema>;
export type UploadListingPhotoQuery = z.infer<
  typeof uploadListingPhotoQuerySchema
>;
export type PatchListingPhotoInput = z.infer<typeof patchListingPhotoSchema>;
export type PatchReviewInput = z.infer<typeof patchReviewSchema>;
export type PatchQuestionInput = z.infer<typeof patchQuestionSchema>;
