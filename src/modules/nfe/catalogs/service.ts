import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  anexosRt,
  benefitCode,
  cfops,
  cfopsEnterprises,
  classificationIbsCbs,
  cstIbsCbs,
  db,
  presumedCredit,
  situationTributaryCst,
} from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListBenefitCodesQuery, ListNfeCatalogQuery } from "./schema.js";

const listCatalog = async (
  table: PgTable,
  descriptionColumn: PgColumn | null,
  orderColumn: PgColumn,
  query: ListNfeCatalogQuery,
  idColumn: PgColumn,
) => {
  const { limit, offset } = resolveListPagination(query);
  const conditions: SQL[] = [];
  if (query.description && descriptionColumn) {
    conditions.push(ilike(descriptionColumn, `%${query.description}%`));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(table)
      .where(where)
      .orderBy(asc(orderColumn), asc(idColumn))
      .limit(limit)
      .offset(offset),
    db.select({ c: count() }).from(table).where(where),
  ]);
  return {
    items,
    total: Number(totalRows[0]?.c ?? 0),
    limit,
    offset,
  };
};

const getCatalog = async (
  table: PgTable,
  idColumn: PgColumn,
  id: string,
  message: string,
  code: string,
) => {
  const rows = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new NotFoundError(message, code);
  }
  return row;
};

export class NfeCatalogsService {
  public listCfops(query: ListNfeCatalogQuery) {
    return listCatalog(cfops, cfops.description, cfops.cfop, query, cfops.id);
  }

  public getCfop(id: string) {
    return getCatalog(cfops, cfops.id, id, "CFOP nao encontrado", "CFOP_NOT_FOUND");
  }

  public listCst(query: ListNfeCatalogQuery) {
    return listCatalog(
      situationTributaryCst,
      situationTributaryCst.description,
      situationTributaryCst.cst,
      query,
      situationTributaryCst.id,
    );
  }

  public getCst(id: string) {
    return getCatalog(
      situationTributaryCst,
      situationTributaryCst.id,
      id,
      "CST nao encontrado",
      "CST_NOT_FOUND",
    );
  }

  public async listBenefitCodes(query: ListBenefitCodesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions: SQL[] = [];
    if (query.uf) {
      conditions.push(eq(benefitCode.uf, query.uf));
    }
    if (query.description) {
      const term = `%${query.description}%`;
      const match = or(
        ilike(benefitCode.codeBenefit, term),
        ilike(benefitCode.descriptionBenefit, term),
      );
      if (match) conditions.push(match);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(benefitCode)
        .where(where)
        .orderBy(asc(benefitCode.uf), asc(benefitCode.codeBenefit), asc(benefitCode.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(benefitCode).where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  public async getBenefitCode(id: string) {
    const row = await db.query.benefitCode.findFirst({
      where: eq(benefitCode.id, id),
      with: {
        compatibleCsts: {
          with: { situationTributaryCst: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundError(
        "Codigo de beneficio nao encontrado",
        "BENEFIT_CODE_NOT_FOUND",
      );
    }
    return row;
  }

  public listCstIbsCbs(query: ListNfeCatalogQuery) {
    return listCatalog(
      cstIbsCbs,
      cstIbsCbs.description,
      cstIbsCbs.cst,
      query,
      cstIbsCbs.id,
    );
  }

  public getCstIbsCbs(id: string) {
    return getCatalog(
      cstIbsCbs,
      cstIbsCbs.id,
      id,
      "CST IBS/CBS nao encontrado",
      "CST_IBS_CBS_NOT_FOUND",
    );
  }

  public listClassification(query: ListNfeCatalogQuery) {
    return listCatalog(
      classificationIbsCbs,
      classificationIbsCbs.nameClassTrib,
      classificationIbsCbs.cClassTrib,
      query,
      classificationIbsCbs.id,
    );
  }

  public getClassification(id: string) {
    return getCatalog(
      classificationIbsCbs,
      classificationIbsCbs.id,
      id,
      "Classificacao IBS/CBS nao encontrada",
      "CLASSIFICATION_IBS_CBS_NOT_FOUND",
    );
  }

  public listPresumedCredits(query: ListNfeCatalogQuery) {
    return listCatalog(
      presumedCredit,
      presumedCredit.description,
      presumedCredit.credPres,
      query,
      presumedCredit.id,
    );
  }

  public getPresumedCredit(id: string) {
    return getCatalog(
      presumedCredit,
      presumedCredit.id,
      id,
      "Credito presumido nao encontrado",
      "PRESUMED_CREDIT_NOT_FOUND",
    );
  }

  public listAnexos(query: ListNfeCatalogQuery) {
    return listCatalog(anexosRt, null, anexosRt.anexo, query, anexosRt.id);
  }

  public getAnexo(id: string) {
    return getCatalog(
      anexosRt,
      anexosRt.id,
      id,
      "Anexo da reforma tributaria nao encontrado",
      "ANEXO_RT_NOT_FOUND",
    );
  }

  public async listCfopsEnterprises(enterpriseId: string) {
    return db
      .select()
      .from(cfopsEnterprises)
      .where(eq(cfopsEnterprises.enterprisesId, enterpriseId))
      .orderBy(asc(cfopsEnterprises.createdAt));
  }
}

export const nfeCatalogsService = new NfeCatalogsService();
