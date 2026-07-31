import type { ILogger } from "../logger/Logger.js";

/**
 * Ejecuta trabajo fuera del ciclo request/response.
 *
 * Existe para que el webhook de WhatsApp pueda responderle 200 a Meta de
 * inmediato: procesar el mensaje implica descargar media, transcribir o
 * describir, y consultar al LLM con herramientas — fácilmente decenas de
 * segundos. Meta no espera tanto: da la entrega por fallida y reintenta.
 *
 * Es también la costura por donde entra una cola real (BullMQ) más adelante:
 * cambia la implementación de este puerto y nada más del sistema se entera. La
 * limitación de la implementación en proceso es que el trabajo no es durable —
 * si el proceso muere a mitad, se depende del reintento de Meta y del rescate
 * de reclamos vencidos en `whatsapp_inbound_messages`.
 */
export interface IBackgroundRunner {
  run(task: () => Promise<void>): void;

  /**
   * Resuelve cuando no queda trabajo pendiente. Es para los tests: sin esto,
   * una prueba del webhook terminaría antes de que el procesamiento ocurra.
   */
  whenIdle(): Promise<void>;
}

export class BackgroundRunner implements IBackgroundRunner {
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly logger: ILogger) {}

  run(task: () => Promise<void>): void {
    // Nadie va a esperar esta promesa, así que un rechazo sin capturar tumbaría
    // el proceso entero. Se absorbe acá y se loguea.
    const promise = (async () => {
      try {
        await task();
      } catch (err) {
        this.logger.error("Background task failed", {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    this.pending.add(promise);
    void promise.finally(() => this.pending.delete(promise));
  }

  async whenIdle(): Promise<void> {
    // Una tarea puede encolar otra, así que no alcanza con esperar una vuelta.
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }
}
