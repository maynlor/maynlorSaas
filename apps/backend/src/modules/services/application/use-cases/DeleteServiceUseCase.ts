import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";

export class DeleteServiceUseCase {
  constructor(private readonly repository: IServiceRepository) {}

  async execute(businessId: string, id: string): Promise<Result<void, AppError>> {
    const service = await this.repository.findById(businessId, id);
    if (!service) {
      return Result.fail(new NotFoundError("Service not found"));
    }

    service.delete();
    await this.repository.save(service);
    return Result.ok(undefined);
  }
}
