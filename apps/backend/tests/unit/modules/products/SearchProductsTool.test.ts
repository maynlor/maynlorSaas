import { describe, it, expect, vi } from "vitest";
import { createSearchProductsTool } from "@modules/products/application/tools/SearchProductsTool.js";
import { Product } from "@modules/products/domain/Product.js";
import type { IProductRepository } from "@modules/products/application/repositories/IProductRepository.js";

const businessId = "b1";

function createRepositoryMock(overrides: Partial<IProductRepository> = {}): IProductRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("createSearchProductsTool", () => {
  it("returns matched products as JSON with name, price, currency and stock", async () => {
    const product = Product.create({
      businessId,
      name: "Remera negra",
      description: "Algodón",
      price: 150.5,
      stock: 4,
    }).value;
    const repo = createRepositoryMock({ search: vi.fn().mockResolvedValue([product]) });
    const tool = createSearchProductsTool(repo, businessId);

    const output = await tool.execute({ query: "remera" });
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;

    expect(repo.search).toHaveBeenCalledWith(businessId, "remera", 10);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      nombre: "Remera negra",
      descripcion: "Algodón",
      precio: 150.5,
      moneda: "ARS",
      stock: 4,
    });
  });

  it("returns a human message when nothing matches", async () => {
    const repo = createRepositoryMock();
    const tool = createSearchProductsTool(repo, businessId);

    const output = await tool.execute({ query: "inexistente" });

    expect(output).toBe("No se encontraron productos para esa búsqueda.");
  });

  it("scopes the search to the tenant it was created for", async () => {
    const repo = createRepositoryMock();
    const tool = createSearchProductsTool(repo, "other-business");

    await tool.execute({ query: "x" });

    expect(repo.search).toHaveBeenCalledWith("other-business", "x", 10);
  });
});
