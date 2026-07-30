import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { ILogger } from "../../shared/logger/Logger.js";
import { BcryptPasswordHasher } from "../../shared/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../../shared/security/JwtTokenService.js";
import { createAuthenticateMiddleware } from "../../presentation/middlewares/authenticate.js";
import { PostgresBusinessRepository } from "../businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresUserRepository } from "../users/infrastructure/persistence/PostgresUserRepository.js";
import { PostgresPlanRepository } from "../subscriptions/infrastructure/persistence/PostgresPlanRepository.js";
import { PostgresSubscriptionRepository } from "../subscriptions/infrastructure/persistence/PostgresSubscriptionRepository.js";
import type { PaymentProvider } from "../subscriptions/application/providers/PaymentProvider.js";
import { RegisterUseCase } from "./application/use-cases/RegisterUseCase.js";
import { LoginUseCase } from "./application/use-cases/LoginUseCase.js";
import { GetCurrentUserUseCase } from "./application/use-cases/GetCurrentUserUseCase.js";
import { AuthController } from "./presentation/AuthController.js";
import { buildAuthRouter } from "./presentation/auth.routes.js";

export interface AuthModuleConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export function createAuthModule(
  db: IDbClient,
  logger: ILogger,
  authConfig: AuthModuleConfig,
  paymentProvider: PaymentProvider,
): { router: Router; authenticate: RequestHandler } {
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(authConfig.jwtSecret, authConfig.jwtExpiresIn);

  const userRepository = new PostgresUserRepository(db);

  const registerUseCase = new RegisterUseCase(
    db,
    (trx) => new PostgresBusinessRepository(trx),
    (trx) => new PostgresUserRepository(trx),
    (trx) => new PostgresPlanRepository(trx),
    (trx) => new PostgresSubscriptionRepository(trx),
    paymentProvider,
    passwordHasher,
    tokenService,
    logger,
  );
  const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

  const controller = new AuthController(registerUseCase, loginUseCase, getCurrentUserUseCase);
  const authenticate = createAuthenticateMiddleware(tokenService);

  return { router: buildAuthRouter(controller, authenticate), authenticate };
}
