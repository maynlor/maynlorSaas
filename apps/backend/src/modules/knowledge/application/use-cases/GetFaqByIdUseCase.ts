import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";
import type { FaqOutputDTO } from "../dtos/FaqDTO.js";
import { FaqMapper } from "../mappers/FaqMapper.js";

export class GetFaqByIdUseCase {
  constructor(private readonly repository: IFaqRepository) {}

  async execute(businessId: string, id: string): Promise<Result<FaqOutputDTO, AppError>> {
    const faq = await this.repository.findById(businessId, id);
    if (!faq) {
      return Result.fail(new NotFoundError("FAQ not found"));
    }
    return Result.ok(FaqMapper.toDTO(faq));
  }
}
