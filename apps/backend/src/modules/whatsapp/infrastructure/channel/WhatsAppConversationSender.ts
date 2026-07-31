import { ValidationError } from "../../../../shared/errors/AppError.js";
import type { ConversationChannelSender } from "../../../conversations/application/providers/ConversationChannelSender.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import type { WhatsAppClient } from "../../application/providers/WhatsAppClient.js";

const WHATSAPP_CHANNEL = "whatsapp";

/**
 * Adaptador que le da salida por WhatsApp al puerto de `conversations`.
 *
 * Vive en el módulo de WhatsApp, no en el de conversaciones: es acá donde se
 * sabe que hace falta el `phoneNumberId` del negocio y el teléfono del cliente.
 * Así `conversations` no se entera de que WhatsApp existe.
 */
export class WhatsAppConversationSender implements ConversationChannelSender {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly clientRepository: IClientRepository,
    private readonly whatsAppClient: WhatsAppClient,
  ) {}

  async send(input: {
    businessId: string;
    clientId: string;
    channel: string;
    text: string;
  }): Promise<void> {
    if (input.channel !== WHATSAPP_CHANNEL) {
      // El canal `api` es la consola de prueba del panel: no hay a dónde
      // entregar el mensaje, y fingir que se envió sería mentirle al negocio.
      throw new ValidationError(
        `Solo se puede responder desde el panel en conversaciones de WhatsApp (esta es del canal "${input.channel}").`,
      );
    }

    const business = await this.businessRepository.findById(input.businessId);
    if (!business?.whatsappPhoneNumberId) {
      throw new ValidationError(
        "Todavía no vinculaste un número de WhatsApp. Conectalo en Configuración para poder responder.",
      );
    }

    const client = await this.clientRepository.findById(input.businessId, input.clientId);
    if (!client?.phone) {
      throw new ValidationError("Este cliente no tiene un teléfono cargado, así que no hay a dónde enviarle el mensaje.");
    }

    await this.whatsAppClient.sendTextMessage(
      business.whatsappPhoneNumberId,
      client.phone,
      input.text,
    );
  }
}
