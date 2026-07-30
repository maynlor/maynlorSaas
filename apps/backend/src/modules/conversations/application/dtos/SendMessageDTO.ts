export interface SendMessageInputDTO {
  message: string;
  conversationId?: string | undefined;
  clientId?: string | undefined;
  channel?: string | undefined;
}

export interface SendMessageOutputDTO {
  conversationId: string;
  reply: string;
}
