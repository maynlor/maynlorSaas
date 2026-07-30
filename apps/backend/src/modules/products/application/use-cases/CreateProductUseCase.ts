import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { Product } from "../../domain/Product.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";
import type { CreateProductInputDTO, ProductOutputDTO } from "../dtos/ProductDTO.js";
import { ProductMapper } from "../mappers/ProductMapper.js";

export class CreateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(
    businessId: string,
    input: CreateProductInputDTO,
  ): Promise<Result<ProductOutputDTO, AppError>> {
    const productResult = Product.create({ businessId, ...input });
    if (productResult.isFailure) {
      return Result.fail(productResult.error);
    }
    const product = productResult.value;

    await this.repository.save(product);
    return Result.ok(ProductMapper.toDTO(product));
  }
}
