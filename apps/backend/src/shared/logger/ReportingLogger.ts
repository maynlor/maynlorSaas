import type { ErrorReporter } from "../errors/ErrorReporter.js";
import type { ILogger } from "./Logger.js";

/**
 * Envuelve un logger para que además reporte los errores al servicio de
 * seguimiento.
 *
 * Se engancha en el logger y no en el middleware de errores de Express porque
 * los fallos que más importan **no son excepciones que suben**: el caso de uso
 * de WhatsApp, por ejemplo, captura el fallo al enviar la respuesta y lo
 * loguea, para poder seguir contestándole 200 a Meta. Un reporte enganchado
 * solo al `errorHandler` se perdería justo esos — que son los que dejan al
 * negocio mudo sin que nadie se entere.
 *
 * Como decorador, ningún punto de llamada existente cambia: alcanza con
 * envolver el logger al construirlo.
 */
export class ReportingLogger implements ILogger {
  constructor(
    private readonly inner: ILogger,
    private readonly reporter: ErrorReporter,
  ) {}

  info(message: string, meta?: object): void {
    this.inner.info(message, meta);
  }

  warn(message: string, meta?: object): void {
    this.inner.warn(message, meta);
  }

  debug(message: string, meta?: object): void {
    this.inner.debug(message, meta);
  }

  error(message: string, meta?: object): void {
    this.inner.error(message, meta);
    // El log local es la fuente de verdad: si el reporte remoto falla, no puede
    // arrastrar consigo al proceso ni tapar el error original.
    try {
      this.reporter.captureError(message, meta);
    } catch {
      // Intencionalmente ignorado.
    }
  }
}
