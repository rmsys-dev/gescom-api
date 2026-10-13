import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { photoUpload } from "../../shared/photos/photo-storage.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { marketplaceController } from "./controller.js";
import {
  characteristicIdParamsSchema,
  createCharacteristicSchema,
  createListingSchema,
  createVariantOptionSchema,
  createVariantOptionValueSchema,
  createVariantSchema,
  listingIdParamsSchema,
  listListingsQuerySchema,
  optionIdParamsSchema,
  optionValueIdParamsSchema,
  patchCharacteristicSchema,
  patchListingPhotoSchema,
  patchListingSchema,
  patchQuestionSchema,
  patchReviewSchema,
  patchVariantOptionSchema,
  patchVariantOptionValueSchema,
  patchVariantSchema,
  photoIdParamsSchema,
  questionIdParamsSchema,
  replaceCharacteristicsSchema,
  reviewIdParamsSchema,
  uploadListingPhotoQuerySchema,
  variantIdParamsSchema,
} from "./schema.js";

const marketplaceRouter = Router();

// --- Listings ---

marketplaceRouter.get(
  "/listings",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_marketplace_produtos"),
  validateSchema({ query: listListingsQuerySchema }),
  marketplaceController.listListings,
);

marketplaceRouter.get(
  "/listings/:listingId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.getListingById,
);

marketplaceRouter.post(
  "/listings",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marketplace_produtos"),
  validateSchema({ body: createListingSchema }),
  marketplaceController.createListing,
);

marketplaceRouter.patch(
  "/listings/:listingId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    body: patchListingSchema,
  }),
  marketplaceController.patchListing,
);

marketplaceRouter.delete(
  "/listings/:listingId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteListing,
);

// --- Characteristics ---

marketplaceRouter.put(
  "/listings/:listingId/characteristics",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    body: replaceCharacteristicsSchema,
  }),
  marketplaceController.replaceCharacteristics,
);

marketplaceRouter.post(
  "/listings/:listingId/characteristics",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    body: createCharacteristicSchema,
  }),
  marketplaceController.createCharacteristic,
);

marketplaceRouter.patch(
  "/characteristics/:characteristicId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: characteristicIdParamsSchema,
    body: patchCharacteristicSchema,
  }),
  marketplaceController.patchCharacteristic,
);

marketplaceRouter.delete(
  "/characteristics/:characteristicId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: characteristicIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteCharacteristic,
);

// --- Variant options / values / variants ---

marketplaceRouter.post(
  "/listings/:listingId/variant-options",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    body: createVariantOptionSchema,
  }),
  marketplaceController.createVariantOption,
);

marketplaceRouter.patch(
  "/variant-options/:optionId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: optionIdParamsSchema,
    body: patchVariantOptionSchema,
  }),
  marketplaceController.patchVariantOption,
);

marketplaceRouter.delete(
  "/variant-options/:optionId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: optionIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteVariantOption,
);

marketplaceRouter.post(
  "/variant-options/:optionId/values",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marketplace_produtos"),
  validateSchema({
    params: optionIdParamsSchema,
    body: createVariantOptionValueSchema,
  }),
  marketplaceController.createVariantOptionValue,
);

marketplaceRouter.patch(
  "/variant-option-values/:valueId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: optionValueIdParamsSchema,
    body: patchVariantOptionValueSchema,
  }),
  marketplaceController.patchVariantOptionValue,
);

marketplaceRouter.delete(
  "/variant-option-values/:valueId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: optionValueIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteVariantOptionValue,
);

marketplaceRouter.post(
  "/listings/:listingId/variants",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marketplace_produtos"),
  validateSchema({
    params: listingIdParamsSchema,
    body: createVariantSchema,
  }),
  marketplaceController.createVariant,
);

marketplaceRouter.patch(
  "/variants/:variantId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: variantIdParamsSchema,
    body: patchVariantSchema,
  }),
  marketplaceController.patchVariant,
);

marketplaceRouter.delete(
  "/variants/:variantId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: variantIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteVariant,
);

// --- Photos ---

marketplaceRouter.post(
  "/listings/:listingId/photos",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  photoUpload,
  validateSchema({
    params: listingIdParamsSchema,
    query: uploadListingPhotoQuerySchema,
  }),
  marketplaceController.addListingPhoto,
);

marketplaceRouter.patch(
  "/photos/:photoId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_produtos"),
  validateSchema({
    params: photoIdParamsSchema,
    body: patchListingPhotoSchema,
  }),
  marketplaceController.patchListingPhoto,
);

marketplaceRouter.delete(
  "/photos/:photoId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marketplace_produtos"),
  validateSchema({
    params: photoIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.deleteListingPhoto,
);

// --- UGC moderation ---

marketplaceRouter.get(
  "/listings/:listingId/reviews",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_avaliacoes"),
  validateSchema({
    params: listingIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.listReviews,
);

marketplaceRouter.patch(
  "/reviews/:reviewId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_avaliacoes"),
  validateSchema({
    params: reviewIdParamsSchema,
    body: patchReviewSchema,
  }),
  marketplaceController.patchReview,
);

marketplaceRouter.get(
  "/listings/:listingId/questions",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_perguntas"),
  validateSchema({
    params: listingIdParamsSchema,
    query: emptyQuerySchema,
  }),
  marketplaceController.listQuestions,
);

marketplaceRouter.patch(
  "/questions/:questionId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marketplace_perguntas"),
  validateSchema({
    params: questionIdParamsSchema,
    body: patchQuestionSchema,
  }),
  marketplaceController.patchQuestion,
);

export { marketplaceRouter };
