import { and, asc, eq } from "drizzle-orm";
import {
  benefitCode,
  benefitCodeByCfop,
  benefitCodeByStateAndProducts,
  benefitTypeCostumers,
  db,
} from "../../../db/schema.js";

export type ResolvedBenefit = {
  codeBenefit: string;
  reductionPercentage: string | null;
};

export type ResolveBenefitInput = {
  enterpriseId: string;
  typeSupplierCustomerId?: string | null;
  stateId: string;
  productsEnterprisesId: string;
  cfop: string;
  cst: string;
};

export const resolveBenefit = async (
  input: ResolveBenefitInput,
): Promise<ResolvedBenefit | null> => {
  const cst = input.cst.slice(-2);

  if (input.typeSupplierCustomerId) {
    const [byCustomerType] = await db
      .select({
        codeBenefit: benefitCode.codeBenefit,
        reductionPercentage: benefitTypeCostumers.reductionPercentage,
      })
      .from(benefitTypeCostumers)
      .innerJoin(benefitCode, eq(benefitCode.id, benefitTypeCostumers.benefitCodeId))
      .where(
        and(
          eq(benefitTypeCostumers.enterpriseId, input.enterpriseId),
          eq(benefitTypeCostumers.typeSupplierCustomerId, input.typeSupplierCustomerId),
          eq(benefitTypeCostumers.cfop, input.cfop),
          eq(benefitTypeCostumers.cst, cst),
        ),
      )
      .orderBy(asc(benefitTypeCostumers.createdAt), asc(benefitTypeCostumers.id))
      .limit(1);
    if (byCustomerType) return byCustomerType;
  }

  const [byCfop] = await db
    .select({
      codeBenefit: benefitCode.codeBenefit,
      reductionPercentage: benefitCodeByCfop.reductionPercentage,
    })
    .from(benefitCodeByCfop)
    .innerJoin(benefitCode, eq(benefitCode.id, benefitCodeByCfop.benefitCodeId))
    .where(
      and(
        eq(benefitCodeByCfop.enterprisesId, input.enterpriseId),
        eq(benefitCodeByCfop.cfop, input.cfop),
        eq(benefitCodeByCfop.cst, cst),
      ),
    )
    .orderBy(asc(benefitCodeByCfop.createdAt), asc(benefitCodeByCfop.id))
    .limit(1);
  if (byCfop) return byCfop;

  const t = benefitCodeByStateAndProducts;
  const [byStateProduct] = await db
    .select({
      codeBenefit: benefitCode.codeBenefit,
      reductionPercentage: t.reductionPercentage,
    })
    .from(t)
    .innerJoin(benefitCode, eq(benefitCode.id, t.benefitCodeId))
    .where(
      and(
        eq(t.enterprisesId, input.enterpriseId),
        eq(t.productsEnterprisesId, input.productsEnterprisesId),
        eq(t.stateId, input.stateId),
        eq(t.cfop, input.cfop),
        eq(t.cst, cst),
      ),
    )
    .orderBy(asc(t.createdAt), asc(t.id))
    .limit(1);
  return byStateProduct ?? null;
};
