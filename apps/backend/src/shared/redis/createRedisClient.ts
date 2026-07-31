import { Redis } from "ioredis";
import type { ILogger } from "../logger/Logger.js";

/**
 * Sin un listener de "error", una desconexión de Redis se propaga como un
 * evento no manejado y tumba todo el proceso — igual que el bug que ya
 * corregimos con `PaymentProvider`. ioredis reintenta solo en segundo plano;
 * acá solo hace falta loguear y dejar que el rate limiting caiga a permitir
 * (fail-open): un límite mal aplicado es preferible a la API entera caída.
 */
export function createRedisClient(url: string | undefined, logger: ILogger): Redis | undefined {
  if (!url) return undefined;

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  });
  client.on("error", (err) => {
    logger.warn("Redis connection error; rate limiting may fall back to per-instance memory", {
      reason: err.message,
    });
  });
  return client;
}
