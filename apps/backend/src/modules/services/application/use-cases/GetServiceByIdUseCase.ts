import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";
import type { ServiceOutputDTO } from "../dtos/ServiceDTO.js";
import { ServiceMapper } from "../mappers/ServiceMapper.js";

export class GetServiceByIdUseCase {
  constructor(private readonly repository: IServiceRepository) {}

  async execute(businessId: string, id: string): Promise<Result<ServiceOutputDTO, AppError>> {
    const service = await this.repository.findById(businessId, id);
    if (!service) {
      return Result.fail(new NotFoundError("Service not found"));
    }
    return Result.ok(ServiceMapper.toDTO(service));
  }
}
