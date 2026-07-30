import pino from "pino";
import type { ILogger } from "./Logger.js";

export class PinoLogger implements ILogger {
  private readonly logger: pino.Logger;

  constructor(level: string) {
    const options: pino.LoggerOptions =
      process.env.NODE_ENV === "development"
        ? { level, transport: { target: "pino-pretty", options: { colorize: true } } }
        : { level };
    this.logger = pino(options);
  }

  info(message: string, meta?: object): void {
    this.logger.info(meta ?? {}, message);
  }

  warn(message: string, meta?: object): void {
    this.logger.warn(meta ?? {}, message);
  }

  error(message: string, meta?: object): void {
    this.logger.error(meta ?? {}, message);
  }

  debug(message: string, meta?: object): void {
    this.logger.debug(meta ?? {}, message);
  }
}
