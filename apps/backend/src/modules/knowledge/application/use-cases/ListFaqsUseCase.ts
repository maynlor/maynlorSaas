import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";
import type { ListFaqsOutputDTO } from "../dtos/FaqDTO.js";
import { FaqMapper } from "../mappers/FaqMapper.js";

export class ListFaqsUseCase {
  constructor(private readonly repository: IFaqRepository) {}

  async execute(
    businessId: string,
    input: { page: number; pageSize: number },
  ): Promise<Result<ListFaqsOutputDTO, AppError>> {
    const limit = input.pageSize;
    const offset = (input.page - 1) * input.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map((faq) => FaqMapper.toDTO(faq)),
      total,
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
