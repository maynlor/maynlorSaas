/**
 * Registro de mensajes entrantes de WhatsApp ya vistos, para que un reintento
 * de Meta no vuelva a procesar el mismo mensaje.
 */
export interface IInboundMessageRepository {
  /**
   * Intenta tomar el mensaje para procesarlo. Devuelve `true` solo si quien
   * llama es el dueño del procesamiento.
   *
   * Debe ser atómico: varias instancias de la API pueden recibir el mismo
   * reintento de Meta al mismo tiempo y solo una tiene que responder.
   */
  claim(externalId: string, phoneNumberId: string): Promise<boolean>;

  /** El mensaje quedó resuelto; ningún reintento debe volver a procesarlo. */
  markCompleted(externalId: string): Promise<void>;

  /**
   * El procesamiento falló por algo transitorio (IA caída, red). Habilita que
   * el próximo reintento de Meta lo vuelva a tomar.
   */
  markFailed(externalId: string): Promise<void>;
}
