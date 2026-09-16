import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService } from "../../shared/responses/send-success-response.js";
import { migrationsService } from "./service.js";
export class MigrationsController {
    listSales = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await migrationsService.listSales(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Vendas recuperadas para migracao.", page);
    };
}
export const migrationsController = new MigrationsController();
