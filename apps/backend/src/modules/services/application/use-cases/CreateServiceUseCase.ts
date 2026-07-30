import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { PlanLimitExceededError } from "../../../../shared/errors/AppError.js";
import { Service } from "../../domain/Service.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";
import type { PlanLimitReader } from "../../../subscriptions/application/services/PlanLimitReader.js";
import type { CreateServiceInputDTO, ServiceOutputDTO } from "../dtos/ServiceDTO.js";
import { ServiceMapper } from "../mappers/ServiceMapper.js";

export class CreateServiceUseCase {
  constructor(
    private readonly repository: IServiceRepository,
    private readonly planLimitReader: PlanLimitReader,
  ) {}

  async execute(
    businessId: string,
    input: CreateServiceInputDTO,
  ): Promise<Result<ServiceOutputDTO, AppError>> {
    const maxServices = await this.planLimitReader.getLimit(businessId, "services");
    if (maxServices !== null) {
      const currentCount = await this.repository.countByBusinessId(businessId);
      if (currentCount >= maxServices) {
        return Result.fail(
          new PlanLimitExceededError(
            `Service limit reached for the current plan (${maxServices}). Upgrade your plan to add more.`,
          ),
        );
      }
    }

    const serviceResult = Service.create({ businessId, ...input });
    if (serviceResult.isFailure) {
      return Result.fail(serviceResult.error);
    }
    const service = serviceResult.value;

    await this.repository.save(service);
    return Result.ok(ServiceMapper.toDTO(service));
  }
}
