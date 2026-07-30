import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";

export class DeleteFaqUseCase {
  constructor(private readonly repository: IFaqRepository) {}

  async execute(businessId: string, id: string): Promise<Result<void, AppError>> {
    const faq = await this.repository.findById(businessId, id);
    if (!faq) {
      return Result.fail(new NotFoundError("FAQ not found"));
    }

    faq.delete();
    await this.repository.save(faq);
    return Result.ok(undefined);
  }
}
