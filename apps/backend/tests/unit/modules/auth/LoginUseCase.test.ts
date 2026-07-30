import { describe, it, expect, vi } from "vitest";
import { LoginUseCase } from "@modules/auth/application/use-cases/LoginUseCase.js";
import { User } from "@modules/users/domain/User.js";
import type { IUserRepository } from "@modules/users/application/repositories/IUserRepository.js";
import type { IPasswordHasher } from "@shared/security/PasswordHasher.js";
import type { ITokenService } from "@shared/security/TokenService.js";
import { UnauthorizedError } from "@shared/errors/AppError.js";

function buildUser() {
  return User.create({
    businessId: "b1",
    email: "owner@acme.com",
    passwordHash: "hashed-password",
  }).value;
}

describe("LoginUseCase", () => {
  it("logs in with valid credentials", async () => {
    const user = buildUser();
    const userRepository: IUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(user),
      existsByEmail: vi.fn(),
    };
    const passwordHasher: IPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn().mockResolvedValue(true),
    };
    const tokenService: ITokenService = {
      sign: vi.fn().mockReturnValue("signed-token"),
      verify: vi.fn(),
    };

    const useCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
    const result = await useCase.execute({ email: "owner@acme.com", password: "supersecret" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.token).toBe("signed-token");
    expect(result.value.user.email).toBe("owner@acme.com");
  });

  it("fails with UnauthorizedError for an unknown email", async () => {
    const userRepository: IUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      existsByEmail: vi.fn(),
    };
    const passwordHasher: IPasswordHasher = { hash: vi.fn(), compare: vi.fn() };
    const tokenService: ITokenService = { sign: vi.fn(), verify: vi.fn() };

    const useCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
    const result = await useCase.execute({ email: "nobody@acme.com", password: "whatever1" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UnauthorizedError);
  });

  it("fails with the same UnauthorizedError for a wrong password", async () => {
    const user = buildUser();
    const userRepository: IUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(user),
      existsByEmail: vi.fn(),
    };
    const passwordHasher: IPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn().mockResolvedValue(false),
    };
    const tokenService: ITokenService = { sign: vi.fn(), verify: vi.fn() };

    const useCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
    const result = await useCase.execute({ email: "owner@acme.com", password: "wrongpass" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UnauthorizedError);
    expect(result.error.message).toBe("Invalid credentials");
  });
});
