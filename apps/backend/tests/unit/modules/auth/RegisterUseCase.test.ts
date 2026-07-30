import { describe, it, expect, vi } from "vitest";
import { RegisterUseCase } from "@modules/auth/application/use-cases/RegisterUseCase.js";
import type { IDbClient } from "@shared/database/DbClient.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import type { IUserRepository } from "@modules/users/application/repositories/IUserRepository.js";
import type { IPasswordHasher } from "@shared/security/PasswordHasher.js";
import type { ITokenService } from "@shared/security/TokenService.js";
import type { ILogger } from "@shared/logger/Logger.js";
import { ConflictError, DomainError } from "@shared/errors/AppError.js";

function createDbMock(): IDbClient {
  return {
    query: vi.fn(),
    transaction: vi.fn(async (fn) => fn(dbMock)),
  } as unknown as IDbClient;
}

let dbMock: IDbClient;

function createBusinessRepoMock(overrides: Partial<IBusinessRepository> = {}): IBusinessRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn(),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function createUserRepoMock(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const passwordHasher: IPasswordHasher = {
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn(),
};

const tokenService: ITokenService = {
  sign: vi.fn().mockReturnValue("signed-token"),
  verify: vi.fn(),
};

const noopLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const validInput = {
  business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
  user: { email: "owner@acme.com", password: "supersecret" },
};

describe("RegisterUseCase", () => {
  it("registers a business and its owner user", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isSuccess).toBe(true);
    expect(result.value.token).toBe("signed-token");
    expect(result.value.business.slug).toBe("acme");
    expect(result.value.user.email).toBe("owner@acme.com");
    expect(businessRepo.save).toHaveBeenCalledOnce();
    expect(userRepo.save).toHaveBeenCalledOnce();
  });

  it("fails with ConflictError when the business already exists", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock({
      existsByEmailOrSlug: vi.fn().mockResolvedValue(true),
    });
    const userRepo = createUserRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it("fails with ConflictError when the user email already exists", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock({ existsByEmail: vi.fn().mockResolvedValue(true) });
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it("fails with a domain error for a password shorter than 8 characters", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute({
      ...validInput,
      user: { email: "owner@acme.com", password: "short" },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(businessRepo.save).not.toHaveBeenCalled();
  });
});
