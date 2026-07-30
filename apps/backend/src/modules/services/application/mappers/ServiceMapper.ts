import type { Service } from "../../domain/Service.js";
import type { ServiceOutputDTO } from "../dtos/ServiceDTO.js";

export class ServiceMapper {
  static toDTO(service: Service): ServiceOutputDTO {
    return {
      id: service.id,
      businessId: service.businessId,
      name: service.name,
      description: service.description,
      price: service.price,
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }
}
