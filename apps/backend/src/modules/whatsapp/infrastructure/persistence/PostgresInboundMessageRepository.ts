import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { IInboundMessageRepository } from "../../application/repositories/IInboundMessageRepository.js";

/**
 * Un reclamo en estado `processing` más viejo que esto se considera huérfano
 * (el proceso que lo tomó murió a mitad) y puede volver a tomarse. Sin este
 * rescate, un reinicio del servidor haría que el mensaje quedara marcado como
 * "en proceso" para siempre y el reintento de Meta lo descartara como
 * duplicado: el cliente nunca recibiría respuesta.
 */
const STALE_CLAIM_SECONDS = 300;

/**
 * Tope de intentos para que un mensaje que siempre falla (payload venenoso) no
 * se reprocese indefinidamente a costa de llamadas pagas al LLM.
 */
const MAX_ATTEMPTS = 5;

export class PostgresInboundMessageRepository implements IInboundMessageRepository {
  constructor(private readonly db: IDbClient) {}

  /**
   * El INSERT ... ON CONFLICT DO UPDATE ... RETURNING resuelve el reclamo en
   * una sola sentencia atómica: si no vuelve ninguna fila es porque el mensaje
   * ya está resuelto, ya lo está procesando otra instancia, o agotó los
   * intentos. No hace falta lock explícito ni transacción.
   */
  async claim(externalId: string, phoneNumberId: string): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO whatsapp_inbound_messages (external_id, phone_number_id, status, attempts, claimed_at)
       VALUES ($1, $2, 'processing', 1, now())
       ON CONFLICT (external_id) DO UPDATE
          SET status = 'processing',
              attempts = whatsapp_inbound_messages.attempts + 1,
              claimed_at = now(),
              updated_at = now()
        WHERE whatsapp_inbound_messages.attempts < $3
          AND (
            whatsapp_inbound_messages.status = 'failed'
            OR (
              whatsapp_inbound_messages.status = 'processing'
              AND whatsapp_inbound_messages.claimed_at < now() - ($4 * interval '1 second')
            )
          )
       RETURNING id`,
      [externalId, phoneNumberId, MAX_ATTEMPTS, STALE_CLAIM_SECONDS],
    );

    return result.rows.length > 0;
  }

  async markCompleted(externalId: string): Promise<void> {
    await this.setStatus(externalId, "completed");
  }

  async markFailed(externalId: string): Promise<void> {
    await this.setStatus(externalId, "failed");
  }

  private async setStatus(externalId: string, status: "completed" | "failed"): Promise<void> {
    await this.db.query(
      `UPDATE whatsapp_inbound_messages
          SET status = $2, updated_at = now()
        WHERE external_id = $1`,
      [externalId, status],
    );
  }
}
