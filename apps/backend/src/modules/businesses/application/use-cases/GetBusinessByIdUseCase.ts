import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IBusinessRepository } from "../repositories/IBusinessRepository.js";
import type { BusinessOutputDTO } from "../dtos/BusinessResponseDTO.js";
import { BusinessMapper } from "../mappers/BusinessMapper.js";

export class GetBusinessByIdUseCase {
  constructor(private readonly repository: IBusinessRepository) {}

  async execute(id: string): Promise<Result<BusinessOutputDTO, AppError>> {
    const business = await this.repository.findById(id);
    if (!business) {
      return Result.fail(new NotFoundError(`Business ${id} not found`));
    }
    return Result.ok(BusinessMapper.toDTO(business));
  }
}
