import { describe, it, expect, vi } from "vitest";
import { UpdateProductUseCase } from "@modules/products/application/use-cases/UpdateProductUseCase.js";
import { DeleteProductUseCase } from "@modules/products/application/use-cases/DeleteProductUseCase.js";
import { Product } from "@modules/products/domain/Product.js";
import type { IProductRepository } from "@modules/products/application/repositories/IProductRepository.js";
import { NotFoundError, DomainError } from "@shared/errors/AppError.js";

const businessId = "b1";

function buildProduct(): Product {
  return Product.create({ businessId, name: "Remera negra", price: 100, stock: 5 }).value;
}

function createRepositoryMock(overrides: Partial<IProductRepository> = {}): IProductRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(buildProduct()),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    search: vi.fn().mockResolvedValue([]),
    countByBusinessId: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("UpdateProductUseCase", () => {
  it("updates the given fields and persists the product", async () => {
    const repo = createRepositoryMock();
    const useCase = new UpdateProductUseCase(repo);

    const result = await useCase.execute(businessId, "p1", { price: 200, stock: 3 });

    expect(result.isSuccess).toBe(true);
    expect(result.value.price).toBe(200);
    expect(result.value.stock).toBe(3);
    expect(result.value.name).toBe("Remera negra");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the product does not exist", async () => {
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new UpdateProductUseCase(repo);

    const result = await useCase.execute(businessId, "missing", { price: 200 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for an invalid price and does not persist", async () => {
    const repo = createRepositoryMock();
    const useCase = new UpdateProductUseCase(repo);

    const result = await useCase.execute(businessId, "p1", { price: -5 });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("DeleteProductUseCase", () => {
  it("soft deletes an existing product", async () => {
    const product = buildProduct();
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(product) });
    const useCase = new DeleteProductUseCase(repo);

    const result = await useCase.execute(businessId, product.id);

    expect(result.isSuccess).toBe(true);
    expect(product.isDeleted).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the product does not exist", async () => {
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new DeleteProductUseCase(repo);

    const result = await useCase.execute(businessId, "missing");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
