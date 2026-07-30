export interface WhatsAppClient {
  sendTextMessage(phoneNumberId: string, to: string, body: string): Promise<void>;
}
