import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IClientRepository } from "../repositories/IClientRepository.js";
import type { ListClientsOutputDTO } from "../dtos/ClientDTO.js";
import { ClientMapper } from "../mappers/ClientMapper.js";

export interface ListClientsQuery {
  page: number;
  pageSize: number;
}

export class ListClientsUseCase {
  constructor(private readonly repository: IClientRepository) {}

  async execute(
    businessId: string,
    query: ListClientsQuery,
  ): Promise<Result<ListClientsOutputDTO, AppError>> {
    const limit = query.pageSize;
    const offset = (query.page - 1) * query.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map(ClientMapper.toDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
