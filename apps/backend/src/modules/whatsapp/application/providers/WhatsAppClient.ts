export interface WhatsAppMediaFile {
  buffer: Buffer;
  mimeType: string;
}

export interface WhatsAppQuickReplyButton {
  id: string;
  title: string;
}

export interface WhatsAppClient {
  sendTextMessage(phoneNumberId: string, to: string, body: string): Promise<void>;
  /** Como máximo 3 botones — límite propio de la API de WhatsApp. */
  sendButtonsMessage(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    buttons: WhatsAppQuickReplyButton[],
  ): Promise<void>;
  downloadMedia(mediaId: string): Promise<WhatsAppMediaFile>;
}
