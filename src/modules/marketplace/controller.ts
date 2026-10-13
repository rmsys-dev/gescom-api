import type { Request, Response } from "express";
import { BadRequestError } from "../../shared/errors/app-error.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendListSuccessResponse,
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
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
  UploadListingPhotoQuery,
} from "./schema.js";
import { marketplaceService } from "./service.js";

export class MarketplaceController {
  public listListings = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListListingsQuery>)
      .validatedQuery;
    const page = await marketplaceService.listListings(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Listings do marketplace listados com sucesso.",
      page,
    );
  };

  public getListingById = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const row = await marketplaceService.getListingById(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Listing do marketplace recuperado com sucesso.",
      data: row,
    });
  };

  public createListing = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateListingInput;
    const row = await marketplaceService.createListing(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      body,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Listing do marketplace criado com sucesso.",
      data: row,
    });
  };

  public patchListing = async (req: Request, res: Response): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const body = req.body as PatchListingInput;
    const row = await marketplaceService.patchListing(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Listing do marketplace atualizado com sucesso.",
      data: row,
    });
  };

  public deleteListing = async (req: Request, res: Response): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const row = await marketplaceService.deleteListing(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Listing do marketplace excluido com sucesso.",
      data: row,
    });
  };

  public replaceCharacteristics = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const body = req.body as ReplaceCharacteristicsInput;
    const rows = await marketplaceService.replaceCharacteristics(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Caracteristicas substituidas com sucesso.",
      data: rows,
    });
  };

  public createCharacteristic = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const body = req.body as CreateCharacteristicInput;
    const row = await marketplaceService.createCharacteristic(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Caracteristica criada com sucesso.",
      data: row,
    });
  };

  public patchCharacteristic = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const characteristicId = req.params["characteristicId"] as string;
    const body = req.body as PatchCharacteristicInput;
    const row = await marketplaceService.patchCharacteristic(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      characteristicId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Caracteristica atualizada com sucesso.",
      data: row,
    });
  };

  public deleteCharacteristic = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const characteristicId = req.params["characteristicId"] as string;
    const row = await marketplaceService.deleteCharacteristic(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      characteristicId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Caracteristica excluida com sucesso.",
      data: row,
    });
  };

  public createVariantOption = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const body = req.body as CreateVariantOptionInput;
    const row = await marketplaceService.createVariantOption(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Opcao de variante criada com sucesso.",
      data: row,
    });
  };

  public patchVariantOption = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const optionId = req.params["optionId"] as string;
    const body = req.body as PatchVariantOptionInput;
    const row = await marketplaceService.patchVariantOption(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      optionId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Opcao de variante atualizada com sucesso.",
      data: row,
    });
  };

  public deleteVariantOption = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const optionId = req.params["optionId"] as string;
    const row = await marketplaceService.deleteVariantOption(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      optionId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Opcao de variante excluida com sucesso.",
      data: row,
    });
  };

  public createVariantOptionValue = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const optionId = req.params["optionId"] as string;
    const body = req.body as CreateVariantOptionValueInput;
    const row = await marketplaceService.createVariantOptionValue(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      optionId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Valor de opcao criado com sucesso.",
      data: row,
    });
  };

  public patchVariantOptionValue = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const valueId = req.params["valueId"] as string;
    const body = req.body as PatchVariantOptionValueInput;
    const row = await marketplaceService.patchVariantOptionValue(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      valueId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Valor de opcao atualizado com sucesso.",
      data: row,
    });
  };

  public deleteVariantOptionValue = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const valueId = req.params["valueId"] as string;
    const row = await marketplaceService.deleteVariantOptionValue(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      valueId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Valor de opcao excluido com sucesso.",
      data: row,
    });
  };

  public createVariant = async (req: Request, res: Response): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const body = req.body as CreateVariantInput;
    const row = await marketplaceService.createVariant(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Variante criada com sucesso.",
      data: row,
    });
  };

  public patchVariant = async (req: Request, res: Response): Promise<void> => {
    const variantId = req.params["variantId"] as string;
    const body = req.body as PatchVariantInput;
    const row = await marketplaceService.patchVariant(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      variantId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Variante atualizada com sucesso.",
      data: row,
    });
  };

  public deleteVariant = async (req: Request, res: Response): Promise<void> => {
    const variantId = req.params["variantId"] as string;
    const row = await marketplaceService.deleteVariant(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      variantId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Variante excluida com sucesso.",
      data: row,
    });
  };

  public addListingPhoto = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const file = (
      req as Request & { file?: { buffer: Buffer; mimetype: string } }
    ).file;
    if (!file) {
      throw new BadRequestError("Foto obrigatoria", "PHOTO_REQUIRED");
    }
    const listingId = req.params["listingId"] as string;
    const query = (
      req as RequestWithValidatedQuery<UploadListingPhotoQuery>
    ).validatedQuery;
    const row = await marketplaceService.addListingPhoto(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
      file,
      query.sortOrder ?? 0,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Foto do listing adicionada com sucesso.",
      data: row,
    });
  };

  public patchListingPhoto = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const photoId = req.params["photoId"] as string;
    const body = req.body as PatchListingPhotoInput;
    const row = await marketplaceService.patchListingPhoto(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      photoId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Foto do listing atualizada com sucesso.",
      data: row,
    });
  };

  public deleteListingPhoto = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const photoId = req.params["photoId"] as string;
    const row = await marketplaceService.deleteListingPhoto(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      photoId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Foto do listing excluida com sucesso.",
      data: row,
    });
  };

  public listReviews = async (req: Request, res: Response): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const items = await marketplaceService.listReviews(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
    );
    sendListSuccessResponse(
      res,
      "Avaliacoes listadas com sucesso.",
      items,
    );
  };

  public patchReview = async (req: Request, res: Response): Promise<void> => {
    const reviewId = req.params["reviewId"] as string;
    const body = req.body as PatchReviewInput;
    const row = await marketplaceService.patchReview(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      reviewId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Avaliacao atualizada com sucesso.",
      data: row,
    });
  };

  public listQuestions = async (req: Request, res: Response): Promise<void> => {
    const listingId = req.params["listingId"] as string;
    const items = await marketplaceService.listQuestions(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      listingId,
    );
    sendListSuccessResponse(res, "Perguntas listadas com sucesso.", items);
  };

  public patchQuestion = async (req: Request, res: Response): Promise<void> => {
    const questionId = req.params["questionId"] as string;
    const body = req.body as PatchQuestionInput;
    const row = await marketplaceService.patchQuestion(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      questionId,
      body,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Pergunta atualizada com sucesso.",
      data: row,
    });
  };
}

export const marketplaceController = new MarketplaceController();
