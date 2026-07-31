/**
 * Entrega un mensaje al cliente por el canal donde ocurre la conversación.
 *
 * Es un puerto para que el módulo `conversations` no dependa de `whatsapp`: la
 * conversación sabe a qué cliente y por qué canal, pero no cómo se envía. El
 * adaptador que resuelve el teléfono del cliente y el número del negocio vive
 * del lado de WhatsApp, y mañana puede haber otro para Instagram o Telegram sin
 * tocar nada de acá.
 */
export interface ConversationChannelSender {
  /**
   * Debe fallar con un error claro cuando el canal no admite envíos salientes
   * (por ejemplo el canal `api`, que es solo la consola de prueba del panel).
   */
  send(input: {
    businessId: string;
    clientId: string;
    channel: string;
    text: string;
  }): Promise<void>;
}
