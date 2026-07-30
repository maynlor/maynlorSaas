import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";
import type { UpdateFaqInputDTO, FaqOutputDTO } from "../dtos/FaqDTO.js";
import { FaqMapper } from "../mappers/FaqMapper.js";

export class UpdateFaqUseCase {
  constructor(private readonly repository: IFaqRepository) {}

  async execute(
    businessId: string,
    id: string,
    input: UpdateFaqInputDTO,
  ): Promise<Result<FaqOutputDTO, AppError>> {
    const faq = await this.repository.findById(businessId, id);
    if (!faq) {
      return Result.fail(new NotFoundError("FAQ not found"));
    }

    const updateResult = faq.update(input);
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    await this.repository.save(faq);
    return Result.ok(FaqMapper.toDTO(faq));
  }
}
