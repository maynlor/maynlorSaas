import type { WhatsAppClient } from "../../application/providers/WhatsAppClient.js";

export class MetaWhatsAppClient implements WhatsAppClient {
  constructor(
    private readonly accessToken: string | undefined,
    private readonly apiVersion: string,
  ) {}

  async sendTextMessage(phoneNumberId: string, to: string, body: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`WhatsApp API request failed with status ${response.status}`);
    }
  }
}
