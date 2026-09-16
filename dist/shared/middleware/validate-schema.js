import { ValidationError } from "../errors/app-error.js";
import { mapZodIssuesToDetails } from "../errors/map-zod-issues.js";
const isValidationConfig = (value) => {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    return !("safeParse" in value) || typeof value.safeParse !== "function";
};
const runValidation = (req, config) => {
    const issues = [];
    if (config.body) {
        const parsed = config.body.safeParse(req.body);
        if (!parsed.success) {
            issues.push(...mapZodIssuesToDetails(parsed.error.issues, "body"));
        }
        else {
            req.body = parsed.data;
        }
    }
    if (config.params) {
        const parsed = config.params.safeParse(req.params);
        if (!parsed.success) {
            issues.push(...mapZodIssuesToDetails(parsed.error.issues, "params"));
        }
        else {
            req.params = parsed.data;
        }
    }
    if (config.query) {
        const parsed = config.query.safeParse(req.query);
        if (!parsed.success) {
            issues.push(...mapZodIssuesToDetails(parsed.error.issues, "query"));
        }
        else {
            req.validatedQuery =
                parsed.data;
        }
    }
    return issues;
};
export function validateSchema(schemaOrConfig) {
    const config = isValidationConfig(schemaOrConfig)
        ? schemaOrConfig
        : { body: schemaOrConfig };
    return (req, _res, next) => {
        const issues = runValidation(req, config);
        if (issues.length > 0) {
            next(new ValidationError(issues));
            return;
        }
        next();
    };
}
