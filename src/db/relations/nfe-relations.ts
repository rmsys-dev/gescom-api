import { relations } from "drizzle-orm";
import { states } from "../entities/addresses.js";
import { enterprises } from "../entities/enterprises.js";
import {
  enterprisesMembers,
  typeSupplierCustomers,
} from "../entities/members.js";
import { icmsTaxation, productsEnterprises, productsNcm } from "../entities/products.js";
import {
  paymentTypes,
  paymentTypesMethodsFlags,
  sales,
} from "../entities/sales.js";
import {
  anexosRt,
  benefitCode,
  benefitCodeByCfop,
  benefitCodeByStateAndProducts,
  benefitTypeCostumers,
  cfops,
  cfopsEnterprises,
  classificationIbsCbs,
  cstCompativelBenefit,
  cstIbsCbs,
  enterprisesNfe,
  enterprisesNfeCertificates,
  enterprisesPrintModels,
  fiscalDocumentModels,
  nfeAdditionalNotes,
  nfeAdvancePayments,
  nfeDuplicates,
  nfeEvents,
  nfeHeaders,
  nfeItemExports,
  nfeItemFuelNozzles,
  nfeItemFuelOrigins,
  nfeItemFuels,
  nfeItemImportAdditions,
  nfeItemImports,
  nfeItemMedicines,
  nfeItemNves,
  nfeItemPresumedCredits,
  nfeItemTaxes,
  nfeItemTracks,
  nfeItemVehicles,
  nfeItemWeapons,
  nfeItems,
  nfePlaces,
  nfeReferencedProcesses,
  nfeOperations,
  nfeOperationsStates,
  presumedCredit,
  nfePayments,
  nfeSales,
  nfeReferences,
  nfeRespTec,
  nfeTransportTrailers,
  nfeTransportVolumeSeals,
  nfeTransportVolumes,
  nfeTransports,
  situationTributaryCst,
} from "../entities/nfe.js";

export const enterprisesNfeRelations = relations(enterprisesNfe, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [enterprisesNfe.enterpriseId],
    references: [enterprises.id],
  }),
}));

export const enterprisesNfeCertificatesRelations = relations(
  enterprisesNfeCertificates,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [enterprisesNfeCertificates.enterpriseId],
      references: [enterprises.id],
    }),
  }),
);

export const nfeHeadersRelations = relations(nfeHeaders, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [nfeHeaders.enterpriseId],
    references: [enterprises.id],
  }),
  emitMember: one(enterprisesMembers, {
    fields: [nfeHeaders.emitMemberId],
    references: [enterprisesMembers.id],
    relationName: "nfeEmitMember",
  }),
  destMember: one(enterprisesMembers, {
    fields: [nfeHeaders.destMemberId],
    references: [enterprisesMembers.id],
    relationName: "nfeDestMember",
  }),
  documentModel: one(fiscalDocumentModels, {
    fields: [nfeHeaders.mod],
    references: [fiscalDocumentModels.code],
  }),
  items: many(nfeItems),
  payments: many(nfePayments),
  sales: many(nfeSales),
  transport: one(nfeTransports, {
    fields: [nfeHeaders.id],
    references: [nfeTransports.nfeHeaderId],
  }),
  references: many(nfeReferences),
  duplicates: many(nfeDuplicates),
  respTec: one(nfeRespTec, {
    fields: [nfeHeaders.id],
    references: [nfeRespTec.nfeHeaderId],
  }),
  events: many(nfeEvents),
  places: many(nfePlaces),
  advancePayments: many(nfeAdvancePayments),
  additionalNotes: many(nfeAdditionalNotes),
  referencedProcesses: many(nfeReferencedProcesses),
}));

export const fiscalDocumentModelsRelations = relations(
  fiscalDocumentModels,
  ({ many }) => ({
    nfeHeaders: many(nfeHeaders),
    printModels: many(enterprisesPrintModels),
  }),
);

export const enterprisesPrintModelsRelations = relations(enterprisesPrintModels, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [enterprisesPrintModels.enterpriseId],
    references: [enterprises.id],
  }),
  documentModel: one(fiscalDocumentModels, {
    fields: [enterprisesPrintModels.documentModelCode],
    references: [fiscalDocumentModels.code],
  }),
}));

export const nfeSalesRelations = relations(nfeSales, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeSales.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
  sale: one(sales, {
    fields: [nfeSales.salesId],
    references: [sales.id],
  }),
}));

export const nfeItemsRelations = relations(nfeItems, ({ one, many }) => ({
  header: one(nfeHeaders, {
    fields: [nfeItems.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
  product: one(productsEnterprises, {
    fields: [nfeItems.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
  taxes: one(nfeItemTaxes, {
    fields: [nfeItems.id],
    references: [nfeItemTaxes.nfeItemId],
  }),
  exports: many(nfeItemExports),
  imports: many(nfeItemImports),
  fuel: one(nfeItemFuels, {
    fields: [nfeItems.id],
    references: [nfeItemFuels.nfeItemId],
  }),
  tracks: many(nfeItemTracks),
  medicines: many(nfeItemMedicines),
  weapons: many(nfeItemWeapons),
  vehicle: one(nfeItemVehicles, {
    fields: [nfeItems.id],
    references: [nfeItemVehicles.nfeItemId],
  }),
  nves: many(nfeItemNves),
  presumedCredits: many(nfeItemPresumedCredits),
}));

export const nfeAdvancePaymentsRelations = relations(nfeAdvancePayments, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeAdvancePayments.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeAdditionalNotesRelations = relations(nfeAdditionalNotes, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeAdditionalNotes.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeReferencedProcessesRelations = relations(
  nfeReferencedProcesses,
  ({ one }) => ({
    header: one(nfeHeaders, {
      fields: [nfeReferencedProcesses.nfeHeaderId],
      references: [nfeHeaders.id],
    }),
  }),
);

export const nfeItemTracksRelations = relations(nfeItemTracks, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemTracks.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemMedicinesRelations = relations(nfeItemMedicines, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemMedicines.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemWeaponsRelations = relations(nfeItemWeapons, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemWeapons.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemVehiclesRelations = relations(nfeItemVehicles, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemVehicles.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemNvesRelations = relations(nfeItemNves, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemNves.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemPresumedCreditsRelations = relations(
  nfeItemPresumedCredits,
  ({ one }) => ({
    item: one(nfeItems, {
      fields: [nfeItemPresumedCredits.nfeItemId],
      references: [nfeItems.id],
    }),
  }),
);

export const nfePlacesRelations = relations(nfePlaces, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfePlaces.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeItemExportsRelations = relations(nfeItemExports, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemExports.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfeItemImportsRelations = relations(
  nfeItemImports,
  ({ one, many }) => ({
    item: one(nfeItems, {
      fields: [nfeItemImports.nfeItemId],
      references: [nfeItems.id],
    }),
    additions: many(nfeItemImportAdditions),
  }),
);

export const nfeItemImportAdditionsRelations = relations(
  nfeItemImportAdditions,
  ({ one }) => ({
    declaration: one(nfeItemImports, {
      fields: [nfeItemImportAdditions.nfeItemImportId],
      references: [nfeItemImports.id],
    }),
  }),
);

export const nfeItemFuelsRelations = relations(
  nfeItemFuels,
  ({ one, many }) => ({
    item: one(nfeItems, {
      fields: [nfeItemFuels.nfeItemId],
      references: [nfeItems.id],
    }),
    nozzles: many(nfeItemFuelNozzles),
    origins: many(nfeItemFuelOrigins),
  }),
);

export const nfeItemFuelNozzlesRelations = relations(
  nfeItemFuelNozzles,
  ({ one }) => ({
    fuel: one(nfeItemFuels, {
      fields: [nfeItemFuelNozzles.nfeItemFuelId],
      references: [nfeItemFuels.id],
    }),
  }),
);

export const nfeItemFuelOriginsRelations = relations(
  nfeItemFuelOrigins,
  ({ one }) => ({
    fuel: one(nfeItemFuels, {
      fields: [nfeItemFuelOrigins.nfeItemFuelId],
      references: [nfeItemFuels.id],
    }),
  }),
);

export const nfeItemTaxesRelations = relations(nfeItemTaxes, ({ one }) => ({
  item: one(nfeItems, {
    fields: [nfeItemTaxes.nfeItemId],
    references: [nfeItems.id],
  }),
}));

export const nfePaymentsRelations = relations(nfePayments, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfePayments.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
  paymentType: one(paymentTypes, {
    fields: [nfePayments.paymentTypeId],
    references: [paymentTypes.id],
  }),
  paymentConfig: one(paymentTypesMethodsFlags, {
    fields: [nfePayments.paymentTypesMethodsFlagsId],
    references: [paymentTypesMethodsFlags.id],
  }),
}));

export const nfeTransportsRelations = relations(
  nfeTransports,
  ({ one, many }) => ({
    header: one(nfeHeaders, {
      fields: [nfeTransports.nfeHeaderId],
      references: [nfeHeaders.id],
    }),
    trailers: many(nfeTransportTrailers),
    volumes: many(nfeTransportVolumes),
  }),
);

export const nfeTransportTrailersRelations = relations(
  nfeTransportTrailers,
  ({ one }) => ({
    transport: one(nfeTransports, {
      fields: [nfeTransportTrailers.nfeTransportId],
      references: [nfeTransports.id],
    }),
  }),
);

export const nfeTransportVolumesRelations = relations(
  nfeTransportVolumes,
  ({ one, many }) => ({
    transport: one(nfeTransports, {
      fields: [nfeTransportVolumes.nfeTransportId],
      references: [nfeTransports.id],
    }),
    seals: many(nfeTransportVolumeSeals),
  }),
);

export const nfeTransportVolumeSealsRelations = relations(
  nfeTransportVolumeSeals,
  ({ one }) => ({
    volume: one(nfeTransportVolumes, {
      fields: [nfeTransportVolumeSeals.nfeTransportVolumeId],
      references: [nfeTransportVolumes.id],
    }),
  }),
);

export const nfeReferencesRelations = relations(nfeReferences, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeReferences.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeDuplicatesRelations = relations(nfeDuplicates, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeDuplicates.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeRespTecRelations = relations(nfeRespTec, ({ one }) => ({
  header: one(nfeHeaders, {
    fields: [nfeRespTec.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const nfeEventsRelations = relations(nfeEvents, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [nfeEvents.enterpriseId],
    references: [enterprises.id],
  }),
  header: one(nfeHeaders, {
    fields: [nfeEvents.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
}));

export const cfopsRelations = relations(cfops, ({ many }) => ({
  enterprises: many(cfopsEnterprises),
}));

export const nfeOperationsRelations = relations(nfeOperations, ({ one }) => ({
  classificationIbsCbs: one(classificationIbsCbs, {
    fields: [nfeOperations.classificationIbsCbsId],
    references: [classificationIbsCbs.id],
  }),
  presumedCredit: one(presumedCredit, {
    fields: [nfeOperations.presumedCreditId],
    references: [presumedCredit.id],
  }),
}));

export const nfeOperationsStatesRelations = relations(nfeOperationsStates, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [nfeOperationsStates.enterpriseId],
    references: [enterprises.id],
  }),
  state: one(states, {
    fields: [nfeOperationsStates.stateId],
    references: [states.id],
  }),
  nfeOperation: one(nfeOperations, {
    fields: [nfeOperationsStates.nfeOperationsId],
    references: [nfeOperations.id],
  }),
  cfopEnterprise: one(cfopsEnterprises, {
    fields: [nfeOperationsStates.cfopEnterprisesId],
    references: [cfopsEnterprises.id],
  }),
  icmsTaxation: one(icmsTaxation, {
    fields: [nfeOperationsStates.icmsTaxationId],
    references: [icmsTaxation.id],
  }),
}));

export const cfopsEnterprisesRelations = relations(cfopsEnterprises, ({ one }) => ({
  cfop: one(cfops, {
    fields: [cfopsEnterprises.cfopId],
    references: [cfops.id],
  }),
  enterprise: one(enterprises, {
    fields: [cfopsEnterprises.enterprisesId],
    references: [enterprises.id],
  }),
}));

export const benefitCodeByCfopRelations = relations(
  benefitCodeByCfop,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [benefitCodeByCfop.enterprisesId],
      references: [enterprises.id],
    }),
    benefitCode: one(benefitCode, {
      fields: [benefitCodeByCfop.benefitCodeId],
      references: [benefitCode.id],
    }),
  }),
);

export const benefitTypeCostumersRelations = relations(
  benefitTypeCostumers,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [benefitTypeCostumers.enterpriseId],
      references: [enterprises.id],
    }),
    typeSupplierCustomer: one(typeSupplierCustomers, {
      fields: [benefitTypeCostumers.typeSupplierCustomerId],
      references: [typeSupplierCustomers.id],
    }),
    benefitCode: one(benefitCode, {
      fields: [benefitTypeCostumers.benefitCodeId],
      references: [benefitCode.id],
    }),
  }),
);

export const benefitCodeByStateAndProductsRelations = relations(
  benefitCodeByStateAndProducts,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [benefitCodeByStateAndProducts.enterprisesId],
      references: [enterprises.id],
    }),
    state: one(states, {
      fields: [benefitCodeByStateAndProducts.stateId],
      references: [states.id],
    }),
    productEnterprise: one(productsEnterprises, {
      fields: [benefitCodeByStateAndProducts.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    benefitCode: one(benefitCode, {
      fields: [benefitCodeByStateAndProducts.benefitCodeId],
      references: [benefitCode.id],
    }),
  }),
);

export const situationTributaryCstRelations = relations(
  situationTributaryCst,
  ({ many }) => ({
    benefits: many(cstCompativelBenefit),
  }),
);

export const benefitCodeRelations = relations(benefitCode, ({ many }) => ({
  compatibleCsts: many(cstCompativelBenefit),
  cfopBenefits: many(benefitCodeByCfop),
  customerTypeBenefits: many(benefitTypeCostumers),
  stateProductBenefits: many(benefitCodeByStateAndProducts),
}));

export const cstCompativelBenefitRelations = relations(
  cstCompativelBenefit,
  ({ one }) => ({
    benefitCode: one(benefitCode, {
      fields: [cstCompativelBenefit.benefitCodeId],
      references: [benefitCode.id],
    }),
    situationTributaryCst: one(situationTributaryCst, {
      fields: [cstCompativelBenefit.situationTributaryCstId],
      references: [situationTributaryCst.id],
    }),
  }),
);

export const cstIbsCbsRelations = relations(cstIbsCbs, ({ many }) => ({
  classifications: many(classificationIbsCbs),
  anexos: many(anexosRt),
}));

export const classificationIbsCbsRelations = relations(
  classificationIbsCbs,
  ({ one, many }) => ({
    cstIbsCbs: one(cstIbsCbs, {
      fields: [classificationIbsCbs.cstIbsCbsId],
      references: [cstIbsCbs.id],
    }),
    anexos: many(anexosRt),
  }),
);

export const anexosRtRelations = relations(anexosRt, ({ one }) => ({
  productsNcm: one(productsNcm, {
    fields: [anexosRt.productsNcmId],
    references: [productsNcm.id],
  }),
  cstIbsCbs: one(cstIbsCbs, {
    fields: [anexosRt.cstIbsCbsId],
    references: [cstIbsCbs.id],
  }),
  classificationIbsCbs: one(classificationIbsCbs, {
    fields: [anexosRt.classificationIbsCbsId],
    references: [classificationIbsCbs.id],
  }),
}));
