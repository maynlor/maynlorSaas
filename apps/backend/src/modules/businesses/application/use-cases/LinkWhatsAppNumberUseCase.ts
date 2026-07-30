import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IBusinessRepository } from "../repositories/IBusinessRepository.js";
import type { BusinessOutputDTO } from "../dtos/BusinessResponseDTO.js";
import { BusinessMapper } from "../mappers/BusinessMapper.js";

export class LinkWhatsAppNumberUseCase {
  constructor(private readonly repository: IBusinessRepository) {}

  async execute(
    businessId: string,
    phoneNumberId: string,
  ): Promise<Result<BusinessOutputDTO, AppError>> {
    const business = await this.repository.findById(businessId);
    if (!business) {
      return Result.fail(new NotFoundError(`Business ${businessId} not found`));
    }

    const existing = await this.repository.findByWhatsAppPhoneNumberId(phoneNumberId);
    if (existing && existing.id !== businessId) {
      return Result.fail(
        new ConflictError("This WhatsApp phone number is already linked to another business"),
      );
    }

    business.linkWhatsAppPhoneNumberId(phoneNumberId);
    await this.repository.save(business);

    return Result.ok(BusinessMapper.toDTO(business));
  }
}
