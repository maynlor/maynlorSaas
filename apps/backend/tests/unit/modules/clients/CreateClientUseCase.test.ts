import { describe, it, expect, vi } from "vitest";
import { CreateClientUseCase } from "@modules/clients/application/use-cases/CreateClientUseCase.js";
import type { IClientRepository } from "@modules/clients/application/repositories/IClientRepository.js";
import { ConflictError, DomainError } from "@shared/errors/AppError.js";

function createRepositoryMock(overrides: Partial<IClientRepository> = {}): IClientRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    existsByPhone: vi.fn().mockResolvedValue(false),
    findByPhone: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const businessId = "b1";

describe("CreateClientUseCase", () => {
  it("creates a client with a valid name", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateClientUseCase(repo);

    const result = await useCase.execute(businessId, { name: "Juan Pérez", phone: "+5491100000000" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe("Juan Pérez");
    expect(result.value.businessId).toBe(businessId);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("creates a client without phone or email", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateClientUseCase(repo);

    const result = await useCase.execute(businessId, { name: "Ana" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.phone).toBeNull();
    expect(result.value.email).toBeNull();
  });

  it("fails with ConflictError when the phone already exists for the tenant", async () => {
    const repo = createRepositoryMock({ existsByPhone: vi.fn().mockResolvedValue(true) });
    const useCase = new CreateClientUseCase(repo);

    const result = await useCase.execute(businessId, { name: "Juan", phone: "+5491100000000" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for a name shorter than 2 characters", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateClientUseCase(repo);

    const result = await useCase.execute(businessId, { name: "A" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
