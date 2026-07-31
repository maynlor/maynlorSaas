import { config } from "./shared/config/Config.js";
import { PinoLogger } from "./shared/logger/PinoLogger.js";
import { ReportingLogger } from "./shared/logger/ReportingLogger.js";
import type { ErrorReporter } from "./shared/errors/ErrorReporter.js";
import { NoopErrorReporter } from "./shared/errors/NoopErrorReporter.js";
import { initSentry, SentryErrorReporter } from "./shared/errors/SentryErrorReporter.js";
import { PgDbClient } from "./shared/database/PgDbClient.js";
import { createApp } from "./app.js";

function createErrorReporter(): ErrorReporter {
  if (!config.sentryDsn) {
    return new NoopErrorReporter();
  }
  initSentry({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: config.releaseCommit,
  });
  return new SentryErrorReporter();
}

async function main(): Promise<void> {
  // Envolver el logger acá alcanza para que todo el sistema reporte: cada
  // módulo ya recibe este mismo logger por inyección.
  const logger = new ReportingLogger(new PinoLogger(config.logLevel), createErrorReporter());
  const db = new PgDbClient(config.databaseUrl);

  const app = createApp(
    db,
    logger,
    {
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn,
      nodeEnv: config.nodeEnv,
      cookieSameSite: config.authCookieSameSite,
    },
    {
      provider: config.aiProvider,
      openaiApiKey: config.openaiApiKey,
      openaiModel: config.openaiModel,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
    },
    undefined,
    {
      verifyToken: config.whatsappVerifyToken,
      accessToken: config.whatsappAccessToken,
      appSecret: config.whatsappAppSecret,
      apiVersion: config.whatsappApiVersion,
    },
    undefined,
    config.webOrigin,
    undefined,
    {
      accessToken: config.mercadoPagoAccessToken,
      webhookSecret: config.mercadoPagoWebhookSecret,
      backUrl: config.mercadoPagoBackUrl,
    },
    {
      api: { windowMs: 60_000, max: config.rateLimitApiMax },
      auth: { windowMs: 15 * 60_000, max: config.rateLimitAuthMax },
      webhook: { windowMs: 60_000, max: config.rateLimitWebhookMax },
    },
    undefined,
    config.redisUrl,
    { apiKey: config.postHogApiKey, host: config.postHogHost },
  );

  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
