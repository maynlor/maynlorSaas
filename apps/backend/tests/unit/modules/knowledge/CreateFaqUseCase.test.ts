import { describe, it, expect, vi } from "vitest";
import { CreateFaqUseCase } from "@modules/knowledge/application/use-cases/CreateFaqUseCase.js";
import { UpdateFaqUseCase } from "@modules/knowledge/application/use-cases/UpdateFaqUseCase.js";
import { Faq } from "@modules/knowledge/domain/Faq.js";
import type { IFaqRepository } from "@modules/knowledge/application/repositories/IFaqRepository.js";
import { DomainError, NotFoundError } from "@shared/errors/AppError.js";

const businessId = "b1";

function createRepositoryMock(overrides: Partial<IFaqRepository> = {}): IFaqRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    search: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("CreateFaqUseCase", () => {
  it("creates a FAQ with valid data", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateFaqUseCase(repo);

    const result = await useCase.execute(businessId, {
      question: "¿Cuáles son los horarios de atención?",
      answer: "De lunes a viernes de 9 a 18 hs.",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.question).toBe("¿Cuáles son los horarios de atención?");
    expect(result.value.isActive).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with a domain error for a too-short question", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateFaqUseCase(repo);

    const result = await useCase.execute(businessId, { question: "¿?", answer: "Respuesta" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for an empty answer", async () => {
    const repo = createRepositoryMock();
    const useCase = new CreateFaqUseCase(repo);

    const result = await useCase.execute(businessId, {
      question: "¿Hacen envíos a domicilio?",
      answer: "   ",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("UpdateFaqUseCase", () => {
  it("updates the answer and persists", async () => {
    const faq = Faq.create({
      businessId,
      question: "¿Hacen envíos a domicilio?",
      answer: "Sí, en CABA.",
    }).value;
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(faq) });
    const useCase = new UpdateFaqUseCase(repo);

    const result = await useCase.execute(businessId, faq.id, { answer: "Sí, a todo el país." });

    expect(result.isSuccess).toBe(true);
    expect(result.value.answer).toBe("Sí, a todo el país.");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the FAQ does not exist", async () => {
    const repo = createRepositoryMock();
    const useCase = new UpdateFaqUseCase(repo);

    const result = await useCase.execute(businessId, "missing", { answer: "x" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
