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
    { jwtSecret: config.jwtSecret, jwtExpiresIn: config.jwtExpiresIn },
    { openaiApiKey: config.openaiApiKey, openaiModel: config.openaiModel },
    undefined,
    {
      verifyToken: config.whatsappVerifyToken,
      accessToken: config.whatsappAccessToken,
      appSecret: config.whatsappAppSecret,
      apiVersion: config.whatsappApiVersion,
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
