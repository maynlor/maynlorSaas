import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { Faq } from "../../domain/Faq.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";
import type { CreateFaqInputDTO, FaqOutputDTO } from "../dtos/FaqDTO.js";
import { FaqMapper } from "../mappers/FaqMapper.js";

export class CreateFaqUseCase {
  constructor(private readonly repository: IFaqRepository) {}

  async execute(
    businessId: string,
    input: CreateFaqInputDTO,
  ): Promise<Result<FaqOutputDTO, AppError>> {
    const faqResult = Faq.create({ businessId, ...input });
    if (faqResult.isFailure) {
      return Result.fail(faqResult.error);
    }
    const faq = faqResult.value;

    await this.repository.save(faq);
    return Result.ok(FaqMapper.toDTO(faq));
  }
}
