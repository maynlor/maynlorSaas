import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { ConflictError } from "../../../../shared/errors/AppError.js";
import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { ILogger } from "../../../../shared/logger/Logger.js";
import type { IPasswordHasher } from "../../../../shared/security/PasswordHasher.js";
import type { ITokenService } from "../../../../shared/security/TokenService.js";
import { Business } from "../../../businesses/domain/Business.js";
import { BusinessMapper } from "../../../businesses/application/mappers/BusinessMapper.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import { User } from "../../../users/domain/User.js";
import { UserMapper } from "../../../users/application/mappers/UserMapper.js";
import type { IUserRepository } from "../../../users/application/repositories/IUserRepository.js";
import { Password } from "../../domain/value-objects/Password.js";
import type { RegisterInputDTO } from "../dtos/RegisterDTO.js";
import type { AuthResponseDTO } from "../dtos/AuthResponseDTO.js";

export type RepositoryFactory<T> = (db: IDbClient) => T;

export class RegisterUseCase {
  constructor(
    private readonly db: IDbClient,
    private readonly createBusinessRepository: RepositoryFactory<IBusinessRepository>,
    private readonly createUserRepository: RepositoryFactory<IUserRepository>,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: RegisterInputDTO): Promise<Result<AuthResponseDTO, AppError>> {
    const passwordResult = Password.create(input.user.password);
    if (passwordResult.isFailure) {
      return Result.fail(passwordResult.error);
    }

    const businessResult = Business.create(input.business);
    if (businessResult.isFailure) {
      return Result.fail(businessResult.error);
    }
    const business = businessResult.value;

    try {
      const { user } = await this.db.transaction(async (trx) => {
        const businessRepo = this.createBusinessRepository(trx);
        const userRepo = this.createUserRepository(trx);

        const businessExists = await businessRepo.existsByEmailOrSlug(
          business.email,
          business.slug,
        );
        if (businessExists) {
          throw new ConflictError("A business with this email or slug already exists");
        }

        const userExists = await userRepo.existsByEmail(input.user.email);
        if (userExists) {
          throw new ConflictError("A user with this email already exists");
        }

        await businessRepo.save(business);

        const passwordHash = await this.passwordHasher.hash(passwordResult.value.toString());
        const userResult = User.create({
          businessId: business.id,
          email: input.user.email,
          passwordHash,
        });
        if (userResult.isFailure) {
          throw userResult.error;
        }
        const user = userResult.value;
        await userRepo.save(user);

        return { user };
      });

      const token = this.tokenService.sign({
        sub: user.id,
        businessId: business.id,
        role: user.role,
      });

      this.logger.info("Business and owner user registered", {
        businessId: business.id,
        userId: user.id,
      });

      return Result.ok({
        token,
        user: UserMapper.toDTO(user),
        business: BusinessMapper.toDTO(business),
      });
    } catch (err) {
      if (err instanceof Error && "statusCode" in err) {
        return Result.fail(err as AppError);
      }
      throw err;
    }
  }
}
