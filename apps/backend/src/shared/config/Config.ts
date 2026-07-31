import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("2h"),
  // "none" solo si el frontend vive en otro sitio registrable que el backend.
  AUTH_COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  WEB_ORIGIN: z.string().default("http://localhost:3001"),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_BACK_URL: z.string().optional(),
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WEBHOOK_MAX: z.coerce.number().int().positive().default(600),
  // Sin esto, el rate limiting queda en memoria por instancia: con varias
  // instancias detrás del balanceador cada una lleva su propia cuenta.
  REDIS_URL: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default("https://us.i.posthog.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  logLevel: parsed.data.LOG_LEVEL,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  authCookieSameSite: parsed.data.AUTH_COOKIE_SAMESITE,
  openaiApiKey: parsed.data.OPENAI_API_KEY,
  openaiModel: parsed.data.OPENAI_MODEL,
  whatsappVerifyToken: parsed.data.WHATSAPP_VERIFY_TOKEN,
  whatsappAccessToken: parsed.data.WHATSAPP_ACCESS_TOKEN,
  whatsappAppSecret: parsed.data.WHATSAPP_APP_SECRET,
  whatsappApiVersion: parsed.data.WHATSAPP_API_VERSION,
  webOrigin: parsed.data.WEB_ORIGIN,
  mercadoPagoAccessToken: parsed.data.MERCADOPAGO_ACCESS_TOKEN,
  mercadoPagoWebhookSecret: parsed.data.MERCADOPAGO_WEBHOOK_SECRET,
  mercadoPagoBackUrl: parsed.data.MERCADOPAGO_BACK_URL,
  rateLimitApiMax: parsed.data.RATE_LIMIT_API_MAX,
  rateLimitAuthMax: parsed.data.RATE_LIMIT_AUTH_MAX,
  rateLimitWebhookMax: parsed.data.RATE_LIMIT_WEBHOOK_MAX,
  redisUrl: parsed.data.REDIS_URL,
  postHogApiKey: parsed.data.POSTHOG_API_KEY,
  postHogHost: parsed.data.POSTHOG_HOST,
};
