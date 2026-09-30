import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";
import {
  EntityAuditActions,
  EntityTypes,
} from "../../shared/audit/entity-types.js";

export const listEntityAuditLogQuerySchema = createPaginationQuerySchema(100).extend({
  search: z.string().trim().min(1).max(255).optional(),
  entityType: z.enum(EntityTypes).optional(),
  entityId: uuidSchema("entityId").optional(),
  action: z.enum(EntityAuditActions).optional(),
  actorUserId: uuidSchema("actorUserId").optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const entityAuditLogParamsSchema = z
  .object({
    entityAuditLogId: uuidSchema("entityAuditLogId"),
  })
  .strict();

export type ListEntityAuditLogQuery = z.infer<typeof listEntityAuditLogQuerySchema>;
