import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";
import type { ProductOutputDTO } from "../dtos/ProductDTO.js";
import { ProductMapper } from "../mappers/ProductMapper.js";

export class GetProductByIdUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(businessId: string, id: string): Promise<Result<ProductOutputDTO, AppError>> {
    const product = await this.repository.findById(businessId, id);
    if (!product) {
      return Result.fail(new NotFoundError("Product not found"));
    }
    return Result.ok(ProductMapper.toDTO(product));
  }
}
