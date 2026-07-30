import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";
import type { UpdateProductInputDTO, ProductOutputDTO } from "../dtos/ProductDTO.js";
import { ProductMapper } from "../mappers/ProductMapper.js";

export class UpdateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(
    businessId: string,
    id: string,
    input: UpdateProductInputDTO,
  ): Promise<Result<ProductOutputDTO, AppError>> {
    const product = await this.repository.findById(businessId, id);
    if (!product) {
      return Result.fail(new NotFoundError("Product not found"));
    }

    const updateResult = product.update(input);
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    await this.repository.save(product);
    return Result.ok(ProductMapper.toDTO(product));
  }
}
