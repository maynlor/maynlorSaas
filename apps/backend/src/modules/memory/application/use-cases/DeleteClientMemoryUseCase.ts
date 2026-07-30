import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IClientMemoryRepository } from "../repositories/IClientMemoryRepository.js";

export class DeleteClientMemoryUseCase {
  constructor(private readonly repository: IClientMemoryRepository) {}

  async execute(businessId: string, id: string): Promise<Result<void, AppError>> {
    const memory = await this.repository.findById(businessId, id);
    if (!memory) {
      return Result.fail(new NotFoundError("Memory entry not found"));
    }

    await this.repository.delete(businessId, id);
    return Result.ok(undefined);
  }
}
