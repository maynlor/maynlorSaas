import { describe, it, expect, vi } from "vitest";
import { CreateProductUseCase } from "@modules/products/application/use-cases/CreateProductUseCase.js";
import type { IProductRepository } from "@modules/products/application/repositories/IProductRepository.js";
import type { PlanLimitReader } from "@modules/subscriptions/application/services/PlanLimitReader.js";
import { DomainError, PlanLimitExceededError } from "@shared/errors/AppError.js";

function createRepositoryMock(overrides: Partial<IProductRepository> = {}): IProductRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    search: vi.fn().mockResolvedValue([]),
    countByBusinessId: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createPlanLimitReaderMock(limit: number | null = null): PlanLimitReader {
  return { getLimit: vi.fn().mockResolvedValue(limit) } as unknown as PlanLimitReader;
}

const businessId = "b1";

describe("CreateProductUseCase", () => {
  it("creates a product with valid data", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock());

    const result = await useCase.execute(businessId, {
      name: "Remera negra",
      description: "Remera de algodón talle M",
      price: 15999.99,
      stock: 10,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.name).toBe("Remera negra");
    expect(result.value.price).toBe(15999.99);
    expect(result.value.currency).toBe("ARS");
    expect(result.value.isActive).toBe(true);
    expect(result.value.businessId).toBe(businessId);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("normalizes currency to uppercase", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock());

    const result = await useCase.execute(businessId, { name: "Gorra", price: 100, currency: "usd" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.currency).toBe("USD");
  });

  it("fails with a domain error for a negative price", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock());

    const result = await useCase.execute(businessId, { name: "Remera", price: -1 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for a name shorter than 2 characters", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock());

    const result = await useCase.execute(businessId, { name: "A", price: 100 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a plan limit error when the plan's product quota is reached", async () => {
    const repo = createRepositoryMock({ countByBusinessId: vi.fn().mockResolvedValue(2) });
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock(2));

    const result = await useCase.execute(businessId, { name: "Remera", price: 100 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PlanLimitExceededError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("allows creating when under the plan's product quota", async () => {
    const repo = createRepositoryMock({ countByBusinessId: vi.fn().mockResolvedValue(1) });
    const useCase = new CreateProductUseCase(repo, createPlanLimitReaderMock(2));

    const result = await useCase.execute(businessId, { name: "Remera", price: 100 });

    expect(result.isSuccess).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
  });
});
