import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";

export class DeleteProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(businessId: string, id: string): Promise<Result<void, AppError>> {
    const product = await this.repository.findById(businessId, id);
    if (!product) {
      return Result.fail(new NotFoundError("Product not found"));
    }

    product.delete();
    await this.repository.save(product);
    return Result.ok(undefined);
  }
}
