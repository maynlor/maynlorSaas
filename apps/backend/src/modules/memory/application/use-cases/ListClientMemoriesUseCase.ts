import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import type { IClientMemoryRepository } from "../repositories/IClientMemoryRepository.js";
import type { ListClientMemoriesOutputDTO } from "../dtos/ClientMemoryDTO.js";
import { ClientMemoryMapper } from "../mappers/ClientMemoryMapper.js";

const DEFAULT_LIMIT = 50;

export class ListClientMemoriesUseCase {
  constructor(
    private readonly repository: IClientMemoryRepository,
    private readonly clientRepository: IClientRepository,
  ) {}

  async execute(
    businessId: string,
    clientId: string,
  ): Promise<Result<ListClientMemoriesOutputDTO, AppError>> {
    const client = await this.clientRepository.findById(businessId, clientId);
    if (!client) {
      return Result.fail(new NotFoundError("Client not found"));
    }

    const memories = await this.repository.findByClientId(businessId, clientId, DEFAULT_LIMIT);
    return Result.ok({ items: memories.map((memory) => ClientMemoryMapper.toDTO(memory)) });
  }
}
