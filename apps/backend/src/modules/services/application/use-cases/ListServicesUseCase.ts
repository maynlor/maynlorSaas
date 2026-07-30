import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";
import type { ListServicesOutputDTO } from "../dtos/ServiceDTO.js";
import { ServiceMapper } from "../mappers/ServiceMapper.js";

export class ListServicesUseCase {
  constructor(private readonly repository: IServiceRepository) {}

  async execute(
    businessId: string,
    input: { page: number; pageSize: number },
  ): Promise<Result<ListServicesOutputDTO, AppError>> {
    const limit = input.pageSize;
    const offset = (input.page - 1) * input.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map((service) => ServiceMapper.toDTO(service)),
      total,
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
