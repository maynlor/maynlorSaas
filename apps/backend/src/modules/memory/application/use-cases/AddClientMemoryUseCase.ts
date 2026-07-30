import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import { ClientMemory } from "../../domain/ClientMemory.js";
import type { IClientMemoryRepository } from "../repositories/IClientMemoryRepository.js";
import type { CreateClientMemoryInputDTO, ClientMemoryOutputDTO } from "../dtos/ClientMemoryDTO.js";
import { ClientMemoryMapper } from "../mappers/ClientMemoryMapper.js";

export class AddClientMemoryUseCase {
  constructor(
    private readonly repository: IClientMemoryRepository,
    private readonly clientRepository: IClientRepository,
  ) {}

  async execute(
    businessId: string,
    clientId: string,
    input: CreateClientMemoryInputDTO,
  ): Promise<Result<ClientMemoryOutputDTO, AppError>> {
    const client = await this.clientRepository.findById(businessId, clientId);
    if (!client) {
      return Result.fail(new NotFoundError("Client not found"));
    }

    const memoryResult = ClientMemory.create({ businessId, clientId, content: input.content });
    if (memoryResult.isFailure) {
      return Result.fail(memoryResult.error);
    }
    const memory = memoryResult.value;

    await this.repository.save(memory);
    return Result.ok(ClientMemoryMapper.toDTO(memory));
  }
}
