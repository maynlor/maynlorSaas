import type { IPlanRepository } from "../repositories/IPlanRepository.js";
import type { PlanOutputDTO } from "../dtos/PlanDTO.js";
import { PlanMapper } from "../mappers/PlanMapper.js";

export class ListPlansUseCase {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(): Promise<PlanOutputDTO[]> {
    const plans = await this.repository.findAllActive();
    return plans.map((plan) => PlanMapper.toDTO(plan));
  }
}
