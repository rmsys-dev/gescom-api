import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  marketplaceProductCharacteristics,
  marketplaceProductPhotos,
  marketplaceProductQuestions,
  marketplaceProductReviews,
  marketplaceProductVariantOptionValues,
  marketplaceProductVariantOptions,
  marketplaceProductVariantSelections,
  marketplaceProductVariants,
  marketplaceProducts,
  productsEnterprises,
} from "../../db/schema.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  removePhoto as removeStoredPhoto,
  savePhoto,
  type PhotoFile,
} from "../../shared/photos/photo-storage.js";
import type {
  CreateCharacteristicInput,
  CreateListingInput,
  CreateVariantInput,
  CreateVariantOptionInput,
  CreateVariantOptionValueInput,
  ListListingsQuery,
  PatchCharacteristicInput,
  PatchListingInput,
  PatchListingPhotoInput,
  PatchQuestionInput,
  PatchReviewInput,
  PatchVariantInput,
  PatchVariantOptionInput,
  PatchVariantOptionValueInput,
  ReplaceCharacteristicsInput,
} from "./schema.js";

export const LISTING_PHOTOS_LIMIT = 5;

export class MarketplaceService {
  private listingScope(enterpriseId: string, listingId?: string) {
    const base = [eq(marketplaceProducts.enterprisesId, enterpriseId)];
    if (listingId) base.push(eq(marketplaceProducts.id, listingId));
    return and(...base);
  }

  private async assertProductsEnterprise(
    enterpriseId: string,
    productsEnterprisesId: string,
  ) {
    const row = (
      await db
        .select({
          id: productsEnterprises.id,
          photoUrl: productsEnterprises.photoUrl,
          description: productsEnterprises.description,
        })
        .from(productsEnterprises)
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(productsEnterprises.id, productsEnterprisesId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Vinculo produto/empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    return row;
  }

  private mapListingConflict(err: unknown): never {
    if (isPostgresUniqueViolation(err)) {
      throw new ConflictError(
        "Listing ja existe para este produto ou slug",
        "MARKETPLACE_PRODUCT_CONFLICT",
      );
    }
    throw err;
  }

  public async listListings(enterpriseId: string, query: ListListingsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [eq(marketplaceProducts.enterprisesId, enterpriseId)];
    if (query.search) {
      conditions.push(ilike(marketplaceProducts.slug, `%${query.search}%`));
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(marketplaceProducts)
        .where(where)
        .orderBy(
          asc(marketplaceProducts.sortOrder),
          asc(marketplaceProducts.slug),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(marketplaceProducts).where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  public async getListingById(enterpriseId: string, listingId: string) {
    const row = await db.query.marketplaceProducts.findFirst({
      where: this.listingScope(enterpriseId, listingId),
      with: {
        characteristics: {
          orderBy: [
            asc(marketplaceProductCharacteristics.sortOrder),
            asc(marketplaceProductCharacteristics.name),
          ],
        },
        photos: {
          orderBy: [
            asc(marketplaceProductPhotos.sortOrder),
            asc(marketplaceProductPhotos.id),
          ],
        },
        variantOptions: {
          orderBy: [
            asc(marketplaceProductVariantOptions.sortOrder),
            asc(marketplaceProductVariantOptions.name),
          ],
          with: {
            values: {
              orderBy: [
                asc(marketplaceProductVariantOptionValues.sortOrder),
                asc(marketplaceProductVariantOptionValues.value),
              ],
            },
          },
        },
        variants: {
          orderBy: [
            asc(marketplaceProductVariants.sortOrder),
            asc(marketplaceProductVariants.id),
          ],
          with: {
            selections: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundError(
        "Produto do marketplace nao encontrado",
        "MARKETPLACE_PRODUCT_NOT_FOUND",
      );
    }
    const { variants, ...rest } = row;
    return {
      ...rest,
      variants: variants.map((variant) => ({
        id: variant.id,
        marketplaceProductId: variant.marketplaceProductId,
        sku: variant.sku,
        productsEnterprisesId: variant.productsEnterprisesId,
        isActive: variant.isActive,
        sortOrder: variant.sortOrder,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        optionValueIds: variant.selections.map((s) => s.optionValueId),
      })),
    };
  }

  private async getListingRow(enterpriseId: string, listingId: string) {
    const row = (
      await db
        .select()
        .from(marketplaceProducts)
        .where(this.listingScope(enterpriseId, listingId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Produto do marketplace nao encontrado",
        "MARKETPLACE_PRODUCT_NOT_FOUND",
      );
    }
    return row;
  }

  public async createListing(enterpriseId: string, input: CreateListingInput) {
    await this.assertProductsEnterprise(
      enterpriseId,
      input.productsEnterprisesId,
    );
    try {
      const [row] = await db
        .insert(marketplaceProducts)
        .values({
          enterprisesId: enterpriseId,
          productsEnterprisesId: input.productsEnterprisesId,
          slug: input.slug,
          isPublished: input.isPublished,
          featured: input.featured,
          freeShipping: input.freeShipping,
          sortOrder: input.sortOrder,
          storeTitle: input.storeTitle ?? null,
          storeDescription: input.storeDescription ?? null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar listing do marketplace");
      return row;
    } catch (err) {
      this.mapListingConflict(err);
    }
  }

  public async patchListing(
    enterpriseId: string,
    listingId: string,
    input: PatchListingInput,
  ) {
    await this.getListingRow(enterpriseId, listingId);
    try {
      const [row] = await db
        .update(marketplaceProducts)
        .set({
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.isPublished !== undefined
            ? { isPublished: input.isPublished }
            : {}),
          ...(input.featured !== undefined ? { featured: input.featured } : {}),
          ...(input.freeShipping !== undefined
            ? { freeShipping: input.freeShipping }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.storeTitle !== undefined
            ? { storeTitle: input.storeTitle }
            : {}),
          ...(input.storeDescription !== undefined
            ? { storeDescription: input.storeDescription }
            : {}),
          updatedAt: new Date(),
        })
        .where(this.listingScope(enterpriseId, listingId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Produto do marketplace nao encontrado",
          "MARKETPLACE_PRODUCT_NOT_FOUND",
        );
      }
      return row;
    } catch (err) {
      this.mapListingConflict(err);
    }
  }

  public async deleteListing(enterpriseId: string, listingId: string) {
    const listing = await this.getListingRow(enterpriseId, listingId);
    const photos = await db
      .select({ photoUrl: marketplaceProductPhotos.photoUrl })
      .from(marketplaceProductPhotos)
      .where(eq(marketplaceProductPhotos.marketplaceProductId, listingId));
    const [row] = await db
      .delete(marketplaceProducts)
      .where(this.listingScope(enterpriseId, listingId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Produto do marketplace nao encontrado",
        "MARKETPLACE_PRODUCT_NOT_FOUND",
      );
    }
    await Promise.all(photos.map((p) => removeStoredPhoto(p.photoUrl)));
    return listing;
  }

  public async replaceCharacteristics(
    enterpriseId: string,
    listingId: string,
    input: ReplaceCharacteristicsInput,
  ) {
    await this.getListingRow(enterpriseId, listingId);
    try {
      return await db.transaction(async (tx) => {
        await tx
          .delete(marketplaceProductCharacteristics)
          .where(
            eq(marketplaceProductCharacteristics.marketplaceProductId, listingId),
          );
        if (input.items.length === 0) return [];
        const rows = await tx
          .insert(marketplaceProductCharacteristics)
          .values(
            input.items.map((item) => ({
              marketplaceProductId: listingId,
              name: item.name,
              value: item.value,
              sortOrder: item.sortOrder,
            })),
          )
          .returning();
        return rows;
      });
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Caracteristica com este nome ja existe no listing",
          "CHARACTERISTIC_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async createCharacteristic(
    enterpriseId: string,
    listingId: string,
    input: CreateCharacteristicInput,
  ) {
    await this.getListingRow(enterpriseId, listingId);
    try {
      const [row] = await db
        .insert(marketplaceProductCharacteristics)
        .values({
          marketplaceProductId: listingId,
          name: input.name,
          value: input.value,
          sortOrder: input.sortOrder,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar caracteristica");
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Caracteristica com este nome ja existe no listing",
          "CHARACTERISTIC_CONFLICT",
        );
      }
      throw err;
    }
  }

  private async getCharacteristicOwned(
    enterpriseId: string,
    characteristicId: string,
  ) {
    const row = (
      await db
        .select({
          characteristic: marketplaceProductCharacteristics,
        })
        .from(marketplaceProductCharacteristics)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductCharacteristics.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductCharacteristics.id, characteristicId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Caracteristica nao encontrada",
        "CHARACTERISTIC_NOT_FOUND",
      );
    }
    return row.characteristic;
  }

  public async patchCharacteristic(
    enterpriseId: string,
    characteristicId: string,
    input: PatchCharacteristicInput,
  ) {
    await this.getCharacteristicOwned(enterpriseId, characteristicId);
    try {
      const [row] = await db
        .update(marketplaceProductCharacteristics)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceProductCharacteristics.id, characteristicId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Caracteristica nao encontrada",
          "CHARACTERISTIC_NOT_FOUND",
        );
      }
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Caracteristica com este nome ja existe no listing",
          "CHARACTERISTIC_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async deleteCharacteristic(
    enterpriseId: string,
    characteristicId: string,
  ) {
    await this.getCharacteristicOwned(enterpriseId, characteristicId);
    const [row] = await db
      .delete(marketplaceProductCharacteristics)
      .where(eq(marketplaceProductCharacteristics.id, characteristicId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Caracteristica nao encontrada",
        "CHARACTERISTIC_NOT_FOUND",
      );
    }
    return row;
  }

  public async createVariantOption(
    enterpriseId: string,
    listingId: string,
    input: CreateVariantOptionInput,
  ) {
    await this.getListingRow(enterpriseId, listingId);
    try {
      const [row] = await db
        .insert(marketplaceProductVariantOptions)
        .values({
          marketplaceProductId: listingId,
          name: input.name,
          sortOrder: input.sortOrder,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar opcao de variante");
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Opcao de variante com este nome ja existe no listing",
          "VARIANT_OPTION_CONFLICT",
        );
      }
      throw err;
    }
  }

  private async getVariantOptionOwned(enterpriseId: string, optionId: string) {
    const row = (
      await db
        .select({
          option: marketplaceProductVariantOptions,
        })
        .from(marketplaceProductVariantOptions)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductVariantOptions.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductVariantOptions.id, optionId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Opcao de variante nao encontrada",
        "VARIANT_OPTION_NOT_FOUND",
      );
    }
    return row.option;
  }

  public async patchVariantOption(
    enterpriseId: string,
    optionId: string,
    input: PatchVariantOptionInput,
  ) {
    await this.getVariantOptionOwned(enterpriseId, optionId);
    try {
      const [row] = await db
        .update(marketplaceProductVariantOptions)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceProductVariantOptions.id, optionId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Opcao de variante nao encontrada",
          "VARIANT_OPTION_NOT_FOUND",
        );
      }
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Opcao de variante com este nome ja existe no listing",
          "VARIANT_OPTION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async deleteVariantOption(enterpriseId: string, optionId: string) {
    await this.getVariantOptionOwned(enterpriseId, optionId);
    const [row] = await db
      .delete(marketplaceProductVariantOptions)
      .where(eq(marketplaceProductVariantOptions.id, optionId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Opcao de variante nao encontrada",
        "VARIANT_OPTION_NOT_FOUND",
      );
    }
    return row;
  }

  public async createVariantOptionValue(
    enterpriseId: string,
    optionId: string,
    input: CreateVariantOptionValueInput,
  ) {
    await this.getVariantOptionOwned(enterpriseId, optionId);
    try {
      const [row] = await db
        .insert(marketplaceProductVariantOptionValues)
        .values({
          optionId,
          value: input.value,
          sortOrder: input.sortOrder,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar valor de opcao");
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Valor de opcao ja existe nesta opcao",
          "VARIANT_OPTION_VALUE_CONFLICT",
        );
      }
      throw err;
    }
  }

  private async getVariantOptionValueOwned(
    enterpriseId: string,
    valueId: string,
  ) {
    const row = (
      await db
        .select({
          value: marketplaceProductVariantOptionValues,
        })
        .from(marketplaceProductVariantOptionValues)
        .innerJoin(
          marketplaceProductVariantOptions,
          eq(
            marketplaceProductVariantOptionValues.optionId,
            marketplaceProductVariantOptions.id,
          ),
        )
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductVariantOptions.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductVariantOptionValues.id, valueId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Valor de opcao nao encontrado",
        "VARIANT_OPTION_VALUE_NOT_FOUND",
      );
    }
    return row.value;
  }

  public async patchVariantOptionValue(
    enterpriseId: string,
    valueId: string,
    input: PatchVariantOptionValueInput,
  ) {
    await this.getVariantOptionValueOwned(enterpriseId, valueId);
    try {
      const [row] = await db
        .update(marketplaceProductVariantOptionValues)
        .set({
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(marketplaceProductVariantOptionValues.id, valueId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Valor de opcao nao encontrado",
          "VARIANT_OPTION_VALUE_NOT_FOUND",
        );
      }
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Valor de opcao ja existe nesta opcao",
          "VARIANT_OPTION_VALUE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async deleteVariantOptionValue(enterpriseId: string, valueId: string) {
    await this.getVariantOptionValueOwned(enterpriseId, valueId);
    const [row] = await db
      .delete(marketplaceProductVariantOptionValues)
      .where(eq(marketplaceProductVariantOptionValues.id, valueId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Valor de opcao nao encontrado",
        "VARIANT_OPTION_VALUE_NOT_FOUND",
      );
    }
    return row;
  }

  private async validateOptionValueIds(
    enterpriseId: string,
    listingId: string,
    optionValueIds: string[],
  ) {
    const options = await db
      .select({ id: marketplaceProductVariantOptions.id })
      .from(marketplaceProductVariantOptions)
      .where(eq(marketplaceProductVariantOptions.marketplaceProductId, listingId));
    if (options.length === 0) {
      throw new BadRequestError(
        "Opcoes de variante ausentes",
        "VARIANT_OPTIONS_MISSING",
      );
    }

    const values = await db
      .select({
        id: marketplaceProductVariantOptionValues.id,
        optionId: marketplaceProductVariantOptionValues.optionId,
        listingId: marketplaceProductVariantOptions.marketplaceProductId,
      })
      .from(marketplaceProductVariantOptionValues)
      .innerJoin(
        marketplaceProductVariantOptions,
        eq(
          marketplaceProductVariantOptionValues.optionId,
          marketplaceProductVariantOptions.id,
        ),
      )
      .innerJoin(
        marketplaceProducts,
        eq(
          marketplaceProductVariantOptions.marketplaceProductId,
          marketplaceProducts.id,
        ),
      )
      .where(
        and(
          eq(marketplaceProducts.enterprisesId, enterpriseId),
          eq(marketplaceProductVariantOptions.marketplaceProductId, listingId),
        ),
      );

    const byId = new Map(values.map((v) => [v.id, v]));
    const seenOptions = new Set<string>();
    for (const id of optionValueIds) {
      const value = byId.get(id);
      if (!value) {
        throw new BadRequestError(
          "Selecao de variante invalida",
          "VARIANT_SELECTION_INVALID",
        );
      }
      if (seenOptions.has(value.optionId)) {
        throw new BadRequestError(
          "Selecao de variante invalida",
          "VARIANT_SELECTION_INVALID",
        );
      }
      seenOptions.add(value.optionId);
    }
  }

  private async getVariantOwned(enterpriseId: string, variantId: string) {
    const row = (
      await db
        .select({
          variant: marketplaceProductVariants,
          listingId: marketplaceProducts.id,
        })
        .from(marketplaceProductVariants)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductVariants.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductVariants.id, variantId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Variante nao encontrada", "VARIANT_NOT_FOUND");
    }
    return row;
  }

  private async getVariantWithSelections(
    enterpriseId: string,
    variantId: string,
  ) {
    const owned = await this.getVariantOwned(enterpriseId, variantId);
    const selections = await db
      .select({ optionValueId: marketplaceProductVariantSelections.optionValueId })
      .from(marketplaceProductVariantSelections)
      .where(eq(marketplaceProductVariantSelections.variantId, variantId));
    return {
      ...owned.variant,
      optionValueIds: selections.map((s) => s.optionValueId),
    };
  }

  public async createVariant(
    enterpriseId: string,
    listingId: string,
    input: CreateVariantInput,
  ) {
    await this.getListingRow(enterpriseId, listingId);
    await this.validateOptionValueIds(
      enterpriseId,
      listingId,
      input.optionValueIds,
    );
    if (input.productsEnterprisesId) {
      await this.assertProductsEnterprise(
        enterpriseId,
        input.productsEnterprisesId,
      );
    }
    try {
      return await db.transaction(async (tx) => {
        const [variant] = await tx
          .insert(marketplaceProductVariants)
          .values({
            marketplaceProductId: listingId,
            sku: input.sku ?? null,
            productsEnterprisesId: input.productsEnterprisesId ?? null,
            isActive: input.isActive,
            sortOrder: input.sortOrder,
          })
          .returning();
        if (!variant) throw new Error("Falha ao criar variante");
        await tx.insert(marketplaceProductVariantSelections).values(
          input.optionValueIds.map((optionValueId) => ({
            variantId: variant.id,
            optionValueId,
          })),
        );
        return {
          ...variant,
          optionValueIds: input.optionValueIds,
        };
      });
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "SKU de variante ja existe neste listing",
          "VARIANT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patchVariant(
    enterpriseId: string,
    variantId: string,
    input: PatchVariantInput,
  ) {
    const owned = await this.getVariantOwned(enterpriseId, variantId);
    if (input.optionValueIds) {
      await this.validateOptionValueIds(
        enterpriseId,
        owned.listingId,
        input.optionValueIds,
      );
    }
    if (input.productsEnterprisesId) {
      await this.assertProductsEnterprise(
        enterpriseId,
        input.productsEnterprisesId,
      );
    }
    try {
      return await db.transaction(async (tx) => {
        const [variant] = await tx
          .update(marketplaceProductVariants)
          .set({
            ...(input.sku !== undefined ? { sku: input.sku } : {}),
            ...(input.productsEnterprisesId !== undefined
              ? { productsEnterprisesId: input.productsEnterprisesId }
              : {}),
            ...(input.isActive !== undefined
              ? { isActive: input.isActive }
              : {}),
            ...(input.sortOrder !== undefined
              ? { sortOrder: input.sortOrder }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(marketplaceProductVariants.id, variantId))
          .returning();
        if (!variant) {
          throw new NotFoundError("Variante nao encontrada", "VARIANT_NOT_FOUND");
        }
        if (input.optionValueIds) {
          await tx
            .delete(marketplaceProductVariantSelections)
            .where(eq(marketplaceProductVariantSelections.variantId, variantId));
          await tx.insert(marketplaceProductVariantSelections).values(
            input.optionValueIds.map((optionValueId) => ({
              variantId,
              optionValueId,
            })),
          );
        }
        const selections = await tx
          .select({
            optionValueId: marketplaceProductVariantSelections.optionValueId,
          })
          .from(marketplaceProductVariantSelections)
          .where(eq(marketplaceProductVariantSelections.variantId, variantId));
        return {
          ...variant,
          optionValueIds: selections.map((s) => s.optionValueId),
        };
      });
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "SKU de variante ja existe neste listing",
          "VARIANT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async deleteVariant(enterpriseId: string, variantId: string) {
    const existing = await this.getVariantWithSelections(
      enterpriseId,
      variantId,
    );
    const [row] = await db
      .delete(marketplaceProductVariants)
      .where(eq(marketplaceProductVariants.id, variantId))
      .returning();
    if (!row) {
      throw new NotFoundError("Variante nao encontrada", "VARIANT_NOT_FOUND");
    }
    return existing;
  }

  private async getPhotoOwned(enterpriseId: string, photoId: string) {
    const row = (
      await db
        .select({
          photo: marketplaceProductPhotos,
          listingId: marketplaceProducts.id,
          productsEnterprisesId: marketplaceProducts.productsEnterprisesId,
        })
        .from(marketplaceProductPhotos)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductPhotos.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductPhotos.id, photoId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Foto do listing nao encontrada",
        "LISTING_PHOTO_NOT_FOUND",
      );
    }
    return row;
  }

  public async addListingPhoto(
    enterpriseId: string,
    listingId: string,
    file: PhotoFile,
    sortOrder = 0,
  ) {
    const listing = await this.getListingRow(enterpriseId, listingId);
    const pe = await this.assertProductsEnterprise(
      enterpriseId,
      listing.productsEnterprisesId,
    );
    const existingCount = (
      await db
        .select({ c: count() })
        .from(marketplaceProductPhotos)
        .where(eq(marketplaceProductPhotos.marketplaceProductId, listingId))
    )[0];
    if (Number(existingCount?.c ?? 0) >= LISTING_PHOTOS_LIMIT) {
      throw new BadRequestError(
        `Limite de ${LISTING_PHOTOS_LIMIT} fotos extras atingido`,
        "LISTING_PHOTOS_LIMIT",
      );
    }

    const photoUrl = await savePhoto({
      folder: "produtos",
      id: listingId,
      name: pe.description ?? listing.slug,
      file,
    });

    if (pe.photoUrl && pe.photoUrl === photoUrl) {
      await removeStoredPhoto(photoUrl);
      throw new ConflictError(
        "Nao duplicar a foto principal do produto",
        "LISTING_PHOTO_CONFLICT",
      );
    }

    try {
      const [row] = await db
        .insert(marketplaceProductPhotos)
        .values({
          marketplaceProductId: listingId,
          photoUrl,
          sortOrder,
        })
        .returning();
      if (!row) {
        await removeStoredPhoto(photoUrl);
        throw new Error("Falha ao gravar foto do listing");
      }
      return row;
    } catch (err) {
      await removeStoredPhoto(photoUrl);
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Foto ja cadastrada neste listing",
          "LISTING_PHOTO_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patchListingPhoto(
    enterpriseId: string,
    photoId: string,
    input: PatchListingPhotoInput,
  ) {
    await this.getPhotoOwned(enterpriseId, photoId);
    const [row] = await db
      .update(marketplaceProductPhotos)
      .set({
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceProductPhotos.id, photoId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Foto do listing nao encontrada",
        "LISTING_PHOTO_NOT_FOUND",
      );
    }
    return row;
  }

  public async deleteListingPhoto(enterpriseId: string, photoId: string) {
    const owned = await this.getPhotoOwned(enterpriseId, photoId);
    const [row] = await db
      .delete(marketplaceProductPhotos)
      .where(eq(marketplaceProductPhotos.id, photoId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Foto do listing nao encontrada",
        "LISTING_PHOTO_NOT_FOUND",
      );
    }
    await removeStoredPhoto(owned.photo.photoUrl);
    return row;
  }

  public async listReviews(enterpriseId: string, listingId: string) {
    await this.getListingRow(enterpriseId, listingId);
    return db
      .select()
      .from(marketplaceProductReviews)
      .where(eq(marketplaceProductReviews.marketplaceProductId, listingId))
      .orderBy(asc(marketplaceProductReviews.createdAt));
  }

  private async getReviewOwned(enterpriseId: string, reviewId: string) {
    const row = (
      await db
        .select({ review: marketplaceProductReviews })
        .from(marketplaceProductReviews)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductReviews.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductReviews.id, reviewId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Avaliacao nao encontrada", "REVIEW_NOT_FOUND");
    }
    return row.review;
  }

  public async patchReview(
    enterpriseId: string,
    reviewId: string,
    input: PatchReviewInput,
  ) {
    await this.getReviewOwned(enterpriseId, reviewId);
    const [row] = await db
      .update(marketplaceProductReviews)
      .set({
        isVisible: input.isVisible,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceProductReviews.id, reviewId))
      .returning();
    if (!row) {
      throw new NotFoundError("Avaliacao nao encontrada", "REVIEW_NOT_FOUND");
    }
    return row;
  }

  public async listQuestions(enterpriseId: string, listingId: string) {
    await this.getListingRow(enterpriseId, listingId);
    return db
      .select()
      .from(marketplaceProductQuestions)
      .where(eq(marketplaceProductQuestions.marketplaceProductId, listingId))
      .orderBy(asc(marketplaceProductQuestions.createdAt));
  }

  private async getQuestionOwned(enterpriseId: string, questionId: string) {
    const row = (
      await db
        .select({ question: marketplaceProductQuestions })
        .from(marketplaceProductQuestions)
        .innerJoin(
          marketplaceProducts,
          eq(
            marketplaceProductQuestions.marketplaceProductId,
            marketplaceProducts.id,
          ),
        )
        .where(
          and(
            eq(marketplaceProductQuestions.id, questionId),
            eq(marketplaceProducts.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Pergunta nao encontrada", "QUESTION_NOT_FOUND");
    }
    return row.question;
  }

  public async patchQuestion(
    enterpriseId: string,
    questionId: string,
    input: PatchQuestionInput,
  ) {
    await this.getQuestionOwned(enterpriseId, questionId);
    const [row] = await db
      .update(marketplaceProductQuestions)
      .set({
        ...(input.answer !== undefined
          ? { answer: input.answer, answeredAt: new Date() }
          : {}),
        ...(input.isVisible !== undefined
          ? { isVisible: input.isVisible }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(marketplaceProductQuestions.id, questionId))
      .returning();
    if (!row) {
      throw new NotFoundError("Pergunta nao encontrada", "QUESTION_NOT_FOUND");
    }
    return row;
  }
}

export const marketplaceService = new MarketplaceService();
