import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { ConflictError } from "../../../../shared/errors/AppError.js";
import { Client } from "../../domain/Client.js";
import type { IClientRepository } from "../repositories/IClientRepository.js";
import type { CreateClientInputDTO, ClientOutputDTO } from "../dtos/ClientDTO.js";
import { ClientMapper } from "../mappers/ClientMapper.js";

export class CreateClientUseCase {
  constructor(private readonly repository: IClientRepository) {}

  async execute(
    businessId: string,
    input: CreateClientInputDTO,
  ): Promise<Result<ClientOutputDTO, AppError>> {
    const clientResult = Client.create({ businessId, ...input });
    if (clientResult.isFailure) {
      return Result.fail(clientResult.error);
    }
    const client = clientResult.value;

    if (client.phone) {
      const phoneTaken = await this.repository.existsByPhone(businessId, client.phone);
      if (phoneTaken) {
        return Result.fail(new ConflictError("A client with this phone already exists"));
      }
    }

    await this.repository.save(client);
    return Result.ok(ClientMapper.toDTO(client));
  }
}
