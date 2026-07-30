import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";
import type { UpdateServiceInputDTO, ServiceOutputDTO } from "../dtos/ServiceDTO.js";
import { ServiceMapper } from "../mappers/ServiceMapper.js";

export class UpdateServiceUseCase {
  constructor(private readonly repository: IServiceRepository) {}

  async execute(
    businessId: string,
    id: string,
    input: UpdateServiceInputDTO,
  ): Promise<Result<ServiceOutputDTO, AppError>> {
    const service = await this.repository.findById(businessId, id);
    if (!service) {
      return Result.fail(new NotFoundError("Service not found"));
    }

    const updateResult = service.update(input);
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    await this.repository.save(service);
    return Result.ok(ServiceMapper.toDTO(service));
  }
}
