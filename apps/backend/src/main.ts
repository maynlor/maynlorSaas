import { config } from "./shared/config/Config.js";
import { PinoLogger } from "./shared/logger/PinoLogger.js";
import { PgDbClient } from "./shared/database/PgDbClient.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  const logger = new PinoLogger(config.logLevel);
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
    { openaiApiKey: config.openaiApiKey, openaiModel: config.openaiModel },
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
  );

  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
