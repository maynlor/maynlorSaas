import type { Message } from "../../domain/Message.js";

export interface IMessageRepository {
  save(message: Message): Promise<void>;
  findByConversationId(
    businessId: string,
    conversationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Message[]; total: number }>;

  /**
   * Los últimos `limit` mensajes, en orden cronológico (el más viejo primero).
   *
   * Distinto de `findByConversationId`, que pagina desde el principio: para
   * armar el contexto de la IA hace falta la cola de la conversación, no la
   * cabeza. En un canal como WhatsApp la conversación no termina nunca, así que
   * paginar desde el inicio terminaría mandándole al modelo los mensajes más
   * viejos y ninguno de los recientes.
   */
  findRecentByConversationId(
    businessId: string,
    conversationId: string,
    limit: number,
  ): Promise<Message[]>;
}
