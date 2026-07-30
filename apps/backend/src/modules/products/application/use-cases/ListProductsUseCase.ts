import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";
import type { ListProductsOutputDTO } from "../dtos/ProductDTO.js";
import { ProductMapper } from "../mappers/ProductMapper.js";

export class ListProductsUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(
    businessId: string,
    input: { page: number; pageSize: number },
  ): Promise<Result<ListProductsOutputDTO, AppError>> {
    const limit = input.pageSize;
    const offset = (input.page - 1) * input.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map((product) => ProductMapper.toDTO(product)),
      total,
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
