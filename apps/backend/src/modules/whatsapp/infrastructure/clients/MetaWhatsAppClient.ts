import { apiHttpError } from "../../../../shared/http/apiHttpError.js";
import type {
  WhatsAppClient,
  WhatsAppMediaFile,
  WhatsAppQuickReplyButton,
} from "../../application/providers/WhatsAppClient.js";

interface MetaMediaMetadataResponse {
  url: string;
  mime_type: string;
}

// Límite real de la API de WhatsApp para el título de un botón de respuesta rápida.
const MAX_BUTTON_TITLE_LENGTH = 20;

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
      throw await apiHttpError(response, "WhatsApp send text message");
    }
  }

  async sendButtonsMessage(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    buttons: WhatsAppQuickReplyButton[],
  ): Promise<void> {
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
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons: buttons.map((button) => ({
                type: "reply",
                reply: { id: button.id, title: button.title.slice(0, MAX_BUTTON_TITLE_LENGTH) },
              })),
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw await apiHttpError(response, "WhatsApp send buttons message");
    }
  }

  async downloadMedia(mediaId: string): Promise<WhatsAppMediaFile> {
    if (!this.accessToken) {
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }

    const metadataResponse = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    if (!metadataResponse.ok) {
      throw await apiHttpError(metadataResponse, "WhatsApp media metadata request");
    }
    const metadata = (await metadataResponse.json()) as MetaMediaMetadataResponse;

    const fileResponse = await fetch(metadata.url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!fileResponse.ok) {
      throw await apiHttpError(fileResponse, "WhatsApp media download");
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    return { buffer, mimeType: metadata.mime_type };
  }
}
