import { BadRequestError } from "../../../shared/errors/app-error.js";
import type { CreateNfeInput } from "../document/schema.js";

const ORIGINS = ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type IcmsOrigin = (typeof ORIGINS)[number];

export type ResolvedStateOperation = {
  id: string;
  uf: string;
  cfop: string;
  cfopDescription: string;
  origin: string;
  cst: string;
  taxationType: "1" | "2" | "3" | "4";
  icms?: string;
  featuresReduction?: boolean;
  stateId?: string;
  interstateAliquot?: string | number | null;
  internalAliquot?: string | number | null;
  fcpAliquot?: string | number | null;
  difalCalculation?: string | null;
  calculatesDifal?: boolean;
  classificationIbsCbsId?: string;
  ibsCbsCst?: string | null;
  pRedIbs?: string | number | null;
  pRedCbs?: string | number | null;
  priority?: boolean;
};

export const findPriorityOperation = (
  operations: ResolvedStateOperation[],
): ResolvedStateOperation | undefined =>
  operations.find(
    (operation) => operation.priority === true && Boolean(operation.classificationIbsCbsId),
  );

export const applyPriorityClassification = (
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  priority: ResolvedStateOperation | undefined,
): { item: CreateNfeInput["items"][number]; operation: ResolvedStateOperation } => {
  if (!priority?.classificationIbsCbsId) return { item, operation };
  const { pRedIbsUf, pRedIbsMun, pRedCbs, ...tax } = item.tax ?? {};
  return {
    item: {
      ...item,
      tax: { ...tax, classificationIbsCbsId: priority.classificationIbsCbsId },
    },
    operation: {
      ...operation,
      classificationIbsCbsId: priority.classificationIbsCbsId,
      ibsCbsCst: priority.ibsCbsCst,
      pRedIbs: priority.pRedIbs,
      pRedCbs: priority.pRedCbs,
    },
  };
};

export type ItemReformRates = {
  pIbsMun: number;
  pIbsUf: number;
  pCbs: number;
  pIs: number;
};

export const fillItemReform = (
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  rates: ItemReformRates | null,
): CreateNfeInput["items"][number] => {
  if (!rates) return item;
  const tax = { ...item.tax };
  const ownClassification =
    !tax.classificationIbsCbsId ||
    tax.classificationIbsCbsId === operation.classificationIbsCbsId;
  if (operation.classificationIbsCbsId) {
    tax.classificationIbsCbsId ??= operation.classificationIbsCbsId;
  }
  tax.pIbsUf ??= rates.pIbsUf;
  tax.pIbsMun ??= rates.pIbsMun;
  tax.pCbs ??= rates.pCbs;
  if (rates.pIs > 0) tax.pIs ??= rates.pIs;
  if (ownClassification) {
    const redIbs = positiveRate(operation.pRedIbs);
    const redCbs = positiveRate(operation.pRedCbs);
    if (redIbs !== undefined) {
      tax.pRedIbsUf ??= redIbs;
      tax.pRedIbsMun ??= redIbs;
    }
    if (redCbs !== undefined) tax.pRedCbs ??= redCbs;
  }
  return { ...item, tax };
};

export type DifalContext = {
  interstate: boolean;
  mod: string;
  indFinal: string | undefined;
  indIeDest: string | undefined;
};

const positiveRate = (value: string | number | null | undefined): number | undefined => {
  const parsed = asAliquot(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

export const fillItemDifal = (
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  context: DifalContext,
): CreateNfeInput["items"][number] => {
  const difalCalculation = operation.difalCalculation;
  if (
    !context.interstate ||
    context.mod !== "55" ||
    context.indFinal !== "1" ||
    context.indIeDest !== "9" ||
    !operation.calculatesDifal ||
    (difalCalculation !== "1" && difalCalculation !== "2") ||
    item.tax?.pIcmsUfDest !== undefined
  ) {
    return item;
  }
  const pIcmsUfDest = asAliquot(operation.internalAliquot);
  const pIcmsInter = asAliquot(operation.interstateAliquot);
  if (pIcmsUfDest === undefined || pIcmsInter === undefined) return item;
  const pFcpUfDest = positiveRate(operation.fcpAliquot);
  return {
    ...item,
    tax: {
      ...item.tax,
      pIcmsUfDest,
      pIcmsInter,
      pIcmsInterPart: 100,
      ...(pFcpUfDest !== undefined ? { pFcpUfDest } : {}),
      difalCalculation,
    },
  };
};

export type ProductIcmsSituation = {
  icms: string;
  icmsRate: string | number | null | undefined;
  simplesIcmsRate: string | number | null | undefined;
  productType: string | undefined;
  crt: string;
  interstate?: boolean;
};

const PRODUCT_TYPE_RESALE = "00";
const PRODUCT_TYPE_OWN = "04";

const itemCst = (item: CreateNfeInput["items"][number]): string | undefined =>
  item.tax?.icmsCsosn ?? item.tax?.icmsCst;

const cfopSuffixForProductType = (productType: string): "101" | "102" | undefined => {
  if (productType === PRODUCT_TYPE_OWN) return "101";
  if (productType === PRODUCT_TYPE_RESALE) return "102";
  return undefined;
};

export type ProductIcmsTaxation = "TRIBUTADO" | "SUBSTITUICAO" | "ISENTO" | "NAO_INCIDENCIA";

const TAXATION_LABEL: Record<ProductIcmsTaxation, string> = {
  TRIBUTADO: "tributado",
  SUBSTITUICAO: "FF substituicao tributaria",
  ISENTO: "II isento",
  NAO_INCIDENCIA: "NN nao incidencia",
};

const TAXATION_TYPES: Record<ProductIcmsTaxation, ReadonlyArray<ResolvedStateOperation["taxationType"]>> = {
  TRIBUTADO: ["1"],
  SUBSTITUICAO: ["2", "3"],
  ISENTO: ["4"],
  NAO_INCIDENCIA: ["4"],
};

const PREFERRED_CST: Partial<Record<ProductIcmsTaxation, string>> = {
  ISENTO: "40",
  NAO_INCIDENCIA: "41",
};

// Codigo de icms_taxation: numerico (01...) tributado, FF, II ou NN. Nao e origem/CST.
export const parseProductIcms = (icms: string): ProductIcmsTaxation => {
  const code = icms.trim().toUpperCase();
  if (code === "FF") return "SUBSTITUICAO";
  if (code === "II") return "ISENTO";
  if (code === "NN") return "NAO_INCIDENCIA";
  if (/^[0-9]{1,4}$/.test(code)) return "TRIBUTADO";
  throw new BadRequestError(
    `Tributacao de ICMS do produto (${icms.trim()}) deve ser numerica (tributado), FF, II ou NN`,
    "NFE_OPERATION_PRODUCT_ICMS",
  );
};

const asAliquot = (value: string | number | null | undefined): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const isSimplesNacional = (crt: string): boolean =>
  crt === "1" || crt === "2" || crt === "4";

export const sameIcmsCode = (left: string | undefined, right: string): boolean => {
  if (!left) return false;
  const a = left.trim().toUpperCase();
  const b = right.trim().toUpperCase();
  if (a === b) return true;
  if (/^[0-9]+$/.test(a) && /^[0-9]+$/.test(b)) return Number(a) === Number(b);
  return false;
};

export const cstForProductIcms = (
  icms: string,
  crt: string,
): Pick<ResolvedStateOperation, "origin" | "cst" | "taxationType"> => {
  const kind = parseProductIcms(icms);
  const simples = isSimplesNacional(crt);
  if (kind === "TRIBUTADO") {
    return { origin: "0", cst: simples ? "102" : "00", taxationType: "1" };
  }
  if (kind === "SUBSTITUICAO") {
    return { origin: "0", cst: simples ? "500" : "60", taxationType: "2" };
  }
  if (kind === "ISENTO") {
    return { origin: "0", cst: simples ? "400" : "40", taxationType: "4" };
  }
  return { origin: "0", cst: simples ? "400" : "41", taxationType: "4" };
};

export const icmsAliquotForCrt = (
  crt: string,
  rates: Pick<ProductIcmsSituation, "icmsRate" | "simplesIcmsRate">,
  interstateAliquot?: string | number | null,
): number | undefined => {
  if (isSimplesNacional(crt)) return undefined;
  if (interstateAliquot !== undefined) return asAliquot(interstateAliquot);
  return asAliquot(rates.icmsRate);
};

export const requiresBenefit = (
  crt: string,
  finNfe: string | undefined,
  operation: Pick<ResolvedStateOperation, "featuresReduction" | "taxationType">,
): boolean =>
  crt === "3" &&
  finNfe === "1" &&
  (operation.featuresReduction === true || operation.taxationType === "4");

export const appliesOwnIcms = (
  taxationType: ResolvedStateOperation["taxationType"],
): boolean => taxationType === "1" || taxationType === "3";

const chooseByProductType = (
  item: CreateNfeInput["items"][number],
  candidates: ResolvedStateOperation[],
  productType: string | undefined,
): ResolvedStateOperation => {
  if (item.cfop) {
    const byCfop = candidates.filter((operation) => operation.cfop === item.cfop);
    if (byCfop.length === 1) return byCfop[0]!;
  }
  if (candidates.length === 1) return candidates[0]!;
  if (!productType) {
    throw new BadRequestError(
      "Ha mais de um CFOP para esta UF. O tipo do produto nao foi encontrado",
      "NFE_OPERATION_PRODUCT_TYPE",
    );
  }
  const suffix = cfopSuffixForProductType(productType);
  if (!suffix) {
    throw new BadRequestError(
      "Ha mais de um CFOP para esta UF. O tipo do produto precisa ser 00 revenda ou 04 produto proprio",
      "NFE_OPERATION_PRODUCT_TYPE",
    );
  }
  const byProduct = candidates.filter((operation) => operation.cfop.endsWith(suffix));
  const productLabel =
    productType === PRODUCT_TYPE_OWN
      ? "04 produto proprio (CFOP final 101)"
      : "00 revenda (CFOP final 102)";
  if (byProduct.length === 1) return byProduct[0]!;
  if (byProduct.length === 0) {
    throw new BadRequestError(
      `Nao ha CFOP de produto ${productLabel} para esta UF`,
      "NFE_OPERATION_PRODUCT_CFOP",
    );
  }
  throw new BadRequestError(
    `Ha mais de um CFOP de produto ${productLabel} para esta UF`,
    "NFE_OPERATION_PRODUCT_CFOP",
  );
};

export const operationForItem = (
  item: CreateNfeInput["items"][number],
  operations: ResolvedStateOperation[],
  productType: string | undefined,
  taxation?: ProductIcmsTaxation,
  icmsCode?: string,
): ResolvedStateOperation => {
  if (icmsCode) {
    const candidates = operations.filter((operation) => sameIcmsCode(operation.icms, icmsCode));
    if (candidates.length === 0) {
      throw new BadRequestError(
        `Item com tributacao ${icmsCode.trim().toUpperCase()} sem operacao fiscal neste estado`,
        "NFE_OPERATION_STATE_CST",
      );
    }
    return chooseByProductType(item, candidates, productType);
  }
  const cst = itemCst(item);
  const origin = item.tax?.icmsOrig;
  let candidates = operations.filter(
    (operation) =>
      (!cst || operation.cst === cst) &&
      (!origin || operation.origin === origin) &&
      (!taxation || TAXATION_TYPES[taxation].includes(operation.taxationType)),
  );
  if (candidates.length === 0) {
    const parts = [
      ...(taxation ? [`tributacao ${TAXATION_LABEL[taxation]}`] : []),
      ...(origin ? [`origem ${origin}`] : []),
      ...(cst ? [`CST ${cst}`] : []),
    ];
    throw new BadRequestError(
      `Item com ${parts.join(", ") || "tributacao"} sem operacao fiscal neste estado`,
      "NFE_OPERATION_STATE_CST",
    );
  }
  const preferredCst = taxation ? PREFERRED_CST[taxation] : undefined;
  if (preferredCst && candidates.length > 1) {
    const preferred = candidates.filter((operation) => operation.cst === preferredCst);
    if (preferred.length > 0) candidates = preferred;
  }
  return chooseByProductType(item, candidates, productType);
};

export const fillItemFiscal = (
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  fiscal: { aliquot: number | undefined; simples: boolean },
): CreateNfeInput["items"][number] => {
  const isCsosn = operation.cst.length === 3;
  const noOwnIcms = isCsosn || fiscal.simples;
  const tax = noOwnIcms
    ? { ...item.tax, pIcms: undefined, pRedBc: undefined }
    : (item.tax ?? {});
  const ownIcms =
    !noOwnIcms &&
    tax.pIcms === undefined &&
    appliesOwnIcms(operation.taxationType) &&
    fiscal.aliquot !== undefined;
  return {
    ...item,
    cfop: item.cfop ?? operation.cfop,
    tax: {
      ...tax,
      ...(tax.icmsOrig ? {} : { icmsOrig: operation.origin as IcmsOrigin }),
      ...(itemCst(item)
        ? {}
        : isCsosn
          ? { icmsCsosn: operation.cst }
          : { icmsCst: operation.cst }),
      ...(ownIcms ? { pIcms: fiscal.aliquot } : {}),
    },
  };
};

export type ProductPisCofins = {
  pisCst: string | null | undefined;
  pisRate: string | number | null | undefined;
  cofinsCst: string | null | undefined;
  cofinsRate: string | number | null | undefined;
};

// 03 e tributado por quantidade; 04 a 09 nao tem aliquota percentual.
const PIS_COFINS_WITHOUT_PERCENT = new Set(["03", "04", "05", "06", "07", "08", "09"]);

const normalizePisCofinsCst = (
  cst: string | null | undefined,
  label: "PIS" | "COFINS",
): string | undefined => {
  const code = cst?.trim();
  if (!code) return undefined;
  const normalized = code.padStart(2, "0");
  if (!/^[0-9]{2}$/.test(normalized)) {
    throw new BadRequestError(
      `CST de ${label} do produto (${code}) deve ter 2 digitos`,
      "NFE_PRODUCT_PIS_COFINS_CST",
    );
  }
  return normalized;
};

export const fillItemPisCofins = (
  item: CreateNfeInput["items"][number],
  product: ProductPisCofins,
): CreateNfeInput["items"][number] => {
  const tax = { ...item.tax };
  const pisCst = tax.pisCst ?? normalizePisCofinsCst(product.pisCst, "PIS");
  if (pisCst) tax.pisCst = pisCst;
  if (
    pisCst &&
    !PIS_COFINS_WITHOUT_PERCENT.has(pisCst) &&
    tax.pPis === undefined &&
    tax.qBcProdPis === undefined
  ) {
    const rate = asAliquot(product.pisRate);
    if (rate !== undefined) tax.pPis = rate;
  }
  const cofinsCst =
    tax.cofinsCst ?? normalizePisCofinsCst(product.cofinsCst, "COFINS");
  if (cofinsCst) tax.cofinsCst = cofinsCst;
  if (
    cofinsCst &&
    !PIS_COFINS_WITHOUT_PERCENT.has(cofinsCst) &&
    tax.pCofins === undefined &&
    tax.qBcProdCofins === undefined
  ) {
    const rate = asAliquot(product.cofinsRate);
    if (rate !== undefined) tax.pCofins = rate;
  }
  return { ...item, tax };
};

export const resolveItemFiscal = (
  item: CreateNfeInput["items"][number],
  operations: ResolvedStateOperation[],
  situation: ProductIcmsSituation,
  icmsCode?: string,
): { item: CreateNfeInput["items"][number]; operation: ResolvedStateOperation } => {
  const code =
    icmsCode ?? (operations.some((operation) => operation.icms) ? situation.icms : undefined);
  const operation = operationForItem(
    item,
    operations,
    situation.productType,
    code ? undefined : parseProductIcms(situation.icms),
    code,
  );
  return {
    operation,
    item: fillItemFiscal(item, operation, {
      aliquot: icmsAliquotForCrt(
        situation.crt,
        situation,
        situation.interstate ? (operation.interstateAliquot ?? null) : undefined,
      ),
      simples: isSimplesNacional(situation.crt),
    }),
  };
};

export const applyProductIcms = (
  item: CreateNfeInput["items"][number],
  operations: ResolvedStateOperation[],
  situation: ProductIcmsSituation,
): CreateNfeInput["items"][number] =>
  resolveItemFiscal(item, operations, situation).item;
