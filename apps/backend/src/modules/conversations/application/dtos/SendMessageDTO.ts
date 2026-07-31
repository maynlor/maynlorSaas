export interface SendMessageInputDTO {
  message: string;
  conversationId?: string | undefined;
  clientId?: string | undefined;
  channel?: string | undefined;
}

export interface SendMessageOutputDTO {
  conversationId: string;
  /**
   * Ausente cuando una persona tomó la conversación: en ese caso el mensaje
   * del cliente se guarda pero la IA no responde.
   */
  reply?: string;
  quickReplies?: string[];
  botPaused?: boolean;
}
