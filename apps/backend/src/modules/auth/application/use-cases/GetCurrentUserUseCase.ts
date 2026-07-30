import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IUserRepository } from "../../../users/application/repositories/IUserRepository.js";
import type { UserOutputDTO } from "../../../users/application/dtos/UserResponseDTO.js";
import { UserMapper } from "../../../users/application/mappers/UserMapper.js";

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(businessId: string, userId: string): Promise<Result<UserOutputDTO, AppError>> {
    const user = await this.userRepository.findById(businessId, userId);
    if (!user) {
      return Result.fail(new NotFoundError("User not found"));
    }
    return Result.ok(UserMapper.toDTO(user));
  }
}
