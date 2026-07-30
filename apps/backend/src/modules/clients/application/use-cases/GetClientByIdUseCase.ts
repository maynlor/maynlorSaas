import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IClientRepository } from "../repositories/IClientRepository.js";
import type { ClientOutputDTO } from "../dtos/ClientDTO.js";
import { ClientMapper } from "../mappers/ClientMapper.js";

export class GetClientByIdUseCase {
  constructor(private readonly repository: IClientRepository) {}

  async execute(businessId: string, id: string): Promise<Result<ClientOutputDTO, AppError>> {
    const client = await this.repository.findById(businessId, id);
    if (!client) {
      return Result.fail(new NotFoundError(`Client ${id} not found`));
    }
    return Result.ok(ClientMapper.toDTO(client));
  }
}
