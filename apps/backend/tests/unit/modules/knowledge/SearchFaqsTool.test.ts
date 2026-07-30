import { describe, it, expect, vi } from "vitest";
import { createSearchFaqsTool } from "@modules/knowledge/application/tools/SearchFaqsTool.js";
import { createSearchServicesTool } from "@modules/services/application/tools/SearchServicesTool.js";
import { Faq } from "@modules/knowledge/domain/Faq.js";
import { Service } from "@modules/services/domain/Service.js";
import type { IFaqRepository } from "@modules/knowledge/application/repositories/IFaqRepository.js";
import type { IServiceRepository } from "@modules/services/application/repositories/IServiceRepository.js";

const businessId = "b1";

describe("createSearchFaqsTool", () => {
  function createRepositoryMock(overrides: Partial<IFaqRepository> = {}): IFaqRepository {
    return {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  it("returns matched FAQs as question/answer JSON scoped to the tenant", async () => {
    const faq = Faq.create({
      businessId,
      question: "¿Cuáles son los horarios?",
      answer: "De 9 a 18 hs.",
    }).value;
    const repo = createRepositoryMock({ search: vi.fn().mockResolvedValue([faq]) });
    const tool = createSearchFaqsTool(repo, businessId);

    const output = await tool.execute({ query: "horarios" });
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;

    expect(repo.search).toHaveBeenCalledWith(businessId, "horarios", 5);
    expect(parsed).toEqual([
      { pregunta: "¿Cuáles son los horarios?", respuesta: "De 9 a 18 hs." },
    ]);
  });

  it("returns a human message when nothing matches", async () => {
    const repo = createRepositoryMock();
    const tool = createSearchFaqsTool(repo, businessId);

    const output = await tool.execute({ query: "algo" });

    expect(output).toBe("No se encontraron preguntas frecuentes sobre ese tema.");
  });
});

describe("createSearchServicesTool", () => {
  function createRepositoryMock(overrides: Partial<IServiceRepository> = {}): IServiceRepository {
    return {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
      countByBusinessId: vi.fn().mockResolvedValue(0),
      ...overrides,
    };
  }

  it("returns matched services as JSON with price and duration", async () => {
    const service = Service.create({
      businessId,
      name: "Corte de pelo",
      price: 8000,
      durationMinutes: 30,
    }).value;
    const repo = createRepositoryMock({ search: vi.fn().mockResolvedValue([service]) });
    const tool = createSearchServicesTool(repo, businessId);

    const output = await tool.execute({ query: "corte" });
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;

    expect(repo.search).toHaveBeenCalledWith(businessId, "corte", 10);
    expect(parsed[0]).toEqual({
      nombre: "Corte de pelo",
      descripcion: null,
      precio: 8000,
      moneda: "ARS",
      duracionMinutos: 30,
    });
  });

  it("returns a human message when nothing matches", async () => {
    const repo = createRepositoryMock();
    const tool = createSearchServicesTool(repo, businessId);

    const output = await tool.execute({ query: "algo" });

    expect(output).toBe("No se encontraron servicios para esa búsqueda.");
  });
});
