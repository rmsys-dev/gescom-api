import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.enum(["development", "test", "production"]))
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().url()),
  DRIZZLE_DATABASE_URL: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().url()),
  JWT_SECRET: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(32)),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1))
    .default("15m"),
  JWT_ISSUER: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1))
    .default("gescom_api"),
  JWT_AUDIENCE: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1))
    .default("gescom_clients"),
  JWT_REFRESH_SECRET: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(32)),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1))
    .default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(5),
  AUTH_LOCK_BASE_MINUTES: z.coerce.number().int().min(1).max(1440).default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  FIRST_ACCESS_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(900000),
  FIRST_ACCESS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  FIRST_ACCESS_EMAIL_LIMIT_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60),
  FIRST_ACCESS_EMAIL_LIMIT_MAX: z.coerce.number().int().min(1).default(3),
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(900000),
  PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  PASSWORD_RESET_EMAIL_LIMIT_WINDOW_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60),
  PASSWORD_RESET_EMAIL_LIMIT_MAX: z.coerce.number().int().min(1).default(3),
  EMAIL_SEND_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(60000),
  EMAIL_SEND_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),
  RESEND_API_KEY: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1)),
  MAIL_FROM: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().email()),
  MAIL_FROM_NAME: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1))
    .default("Gescom"),
  INVITATION_CODE_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60),
  INVITATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  INVITATION_CODE_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  PASSWORD_RESET_CODE_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60),
  PASSWORD_RESET_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),
  PASSWORD_RESET_CODE_LENGTH: z.coerce
    .number()
    .int()
    .min(4)
    .max(10)
    .default(6),
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.trim())
    .optional(),
  // RMSys Maintainer API Key - Remover este campo quando a API for publicada
  MAINTAINER_API_KEY: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(32)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment variables: ${errors}`);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
