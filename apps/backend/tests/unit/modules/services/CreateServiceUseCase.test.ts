import { describe, it, expect, vi } from "vitest";
import { CreateServiceUseCase } from "@modules/services/application/use-cases/CreateServiceUseCase.js";
import { UpdateServiceUseCase } from "@modules/services/application/use-cases/UpdateServiceUseCase.js";
import { Service } from "@modules/services/domain/Service.js";
import type { IServiceRepository } from "@modules/services/application/repositories/IServiceRepository.js";
import { DomainError, NotFoundError } from "@shared/errors/AppError.js";

const businessId = "b1";

function createRepositoryMock(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    search: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("CreateServiceUseCase", () => {
  it("creates a service with valid data", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateServiceUseCase(repo);

    const result = await useCase.execute(businessId, {
      name: "Corte de pelo",
      description: "Corte clásico",
      price: 8000,
      durationMinutes: 30,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe("Corte de pelo");
    expect(result.value.durationMinutes).toBe(30);
    expect(result.value.currency).toBe("ARS");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with a domain error for a negative price", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateServiceUseCase(repo);

    const result = await useCase.execute(businessId, { name: "Corte", price: -10 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for a non-positive duration", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateServiceUseCase(repo);

    const result = await useCase.execute(businessId, {
      name: "Corte",
      price: 100,
      durationMinutes: 0,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("UpdateServiceUseCase", () => {
  it("updates fields and persists", async () => {
    const service = Service.create({ businessId, name: "Corte", price: 100 }).value;
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(service) });
    const useCase = new UpdateServiceUseCase(repo);

    const result = await useCase.execute(businessId, service.id, {
      price: 150,
      durationMinutes: 45,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.price).toBe(150);
    expect(result.value.durationMinutes).toBe(45);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the service does not exist", async () => {
    const repo = createRepositoryMock();
    const useCase = new UpdateServiceUseCase(repo);

    const result = await useCase.execute(businessId, "missing", { price: 150 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
