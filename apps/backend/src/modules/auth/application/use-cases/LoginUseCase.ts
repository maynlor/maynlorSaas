import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { UnauthorizedError } from "../../../../shared/errors/AppError.js";
import type { IPasswordHasher } from "../../../../shared/security/PasswordHasher.js";
import type { ITokenService } from "../../../../shared/security/TokenService.js";
import type { IUserRepository } from "../../../users/application/repositories/IUserRepository.js";
import { UserMapper } from "../../../users/application/mappers/UserMapper.js";
import type { LoginInputDTO } from "../dtos/LoginDTO.js";
import type { LoginResponseDTO } from "../dtos/AuthResponseDTO.js";

const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials";

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInputDTO): Promise<Result<LoginResponseDTO, AppError>> {
    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

    if (!user || !user.isActive) {
      return Result.fail(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE));
    }

    const passwordMatches = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      return Result.fail(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE));
    }

    const token = this.tokenService.sign({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
    });

    return Result.ok({ token, user: UserMapper.toDTO(user) });
  }
}
