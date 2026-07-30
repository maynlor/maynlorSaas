export interface WhatsAppMediaFile {
  buffer: Buffer;
  mimeType: string;
}

export interface WhatsAppClient {
  sendTextMessage(phoneNumberId: string, to: string, body: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<WhatsAppMediaFile>;
}
