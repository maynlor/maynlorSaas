import type { Business } from "../../domain/Business.js";
import type { BusinessOutputDTO } from "../dtos/BusinessResponseDTO.js";

export class BusinessMapper {
  static toDTO(business: Business): BusinessOutputDTO {
    return {
      id: business.id,
      name: business.name,
      email: business.email,
      slug: business.slug,
      isActive: business.isActive,
      whatsappPhoneNumberId: business.whatsappPhoneNumberId,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }
}
