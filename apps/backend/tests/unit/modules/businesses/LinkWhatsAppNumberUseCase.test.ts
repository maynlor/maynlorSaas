import { describe, it, expect, vi } from "vitest";
import { LinkWhatsAppNumberUseCase } from "@modules/businesses/application/use-cases/LinkWhatsAppNumberUseCase.js";
import { Business } from "@modules/businesses/domain/Business.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import { ConflictError, NotFoundError } from "@shared/errors/AppError.js";

function buildBusiness() {
  return Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
}

function createRepositoryMock(overrides: Partial<IBusinessRepository> = {}): IBusinessRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn().mockResolvedValue(null),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn(),
    ...overrides,
  };
}

describe("LinkWhatsAppNumberUseCase", () => {
  it("links a phoneNumberId to the business", async () => {
    const business = buildBusiness();
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(business) });
    const useCase = new LinkWhatsAppNumberUseCase(repo);

    const result = await useCase.execute(business.id, "1234567890");

    expect(result.isSuccess).toBe(true);
    expect(result.value.whatsappPhoneNumberId).toBe("1234567890");
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the business does not exist", async () => {
    const repo = createRepositoryMock({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new LinkWhatsAppNumberUseCase(repo);

    const result = await useCase.execute("00000000-0000-0000-0000-000000000000", "1234567890");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("fails with ConflictError when the number is already linked to another business", async () => {
    const business = buildBusiness();
    const otherBusiness = Business.create({
      name: "Zeta",
      email: "biz@zeta.com",
      slug: "zeta",
    }).value;
    const repo = createRepositoryMock({
      findById: vi.fn().mockResolvedValue(business),
      findByWhatsAppPhoneNumberId: vi.fn().mockResolvedValue(otherBusiness),
    });
    const useCase = new LinkWhatsAppNumberUseCase(repo);

    const result = await useCase.execute(business.id, "1234567890");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("allows re-linking the same number to the same business (idempotent)", async () => {
    const business = buildBusiness();
    const repo = createRepositoryMock({
      findById: vi.fn().mockResolvedValue(business),
      findByWhatsAppPhoneNumberId: vi.fn().mockResolvedValue(business),
    });
    const useCase = new LinkWhatsAppNumberUseCase(repo);

    const result = await useCase.execute(business.id, "1234567890");

    expect(result.isSuccess).toBe(true);
  });
});
