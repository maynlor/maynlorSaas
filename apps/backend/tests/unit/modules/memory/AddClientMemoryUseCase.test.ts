import { describe, it, expect, vi } from "vitest";
import { AddClientMemoryUseCase } from "@modules/memory/application/use-cases/AddClientMemoryUseCase.js";
import { ListClientMemoriesUseCase } from "@modules/memory/application/use-cases/ListClientMemoriesUseCase.js";
import { DeleteClientMemoryUseCase } from "@modules/memory/application/use-cases/DeleteClientMemoryUseCase.js";
import { ClientMemory } from "@modules/memory/domain/ClientMemory.js";
import { Client } from "@modules/clients/domain/Client.js";
import type { IClientMemoryRepository } from "@modules/memory/application/repositories/IClientMemoryRepository.js";
import type { IClientRepository } from "@modules/clients/application/repositories/IClientRepository.js";
import { DomainError, NotFoundError } from "@shared/errors/AppError.js";

const businessId = "b1";
const clientId = "c1";

function buildClient() {
  return Client.create({ businessId, name: "Juan" }).value;
}

function memoryRepoMock(overrides: Partial<IClientMemoryRepository> = {}): IClientMemoryRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByClientId: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function clientRepoMock(overrides: Partial<IClientRepository> = {}): IClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildClient()),
    findAll: vi.fn(),
    existsByPhone: vi.fn(),
    findByPhone: vi.fn(),
    ...overrides,
  };
}

describe("AddClientMemoryUseCase", () => {
  it("saves a memory entry for an existing client", async () => {
    const memoryRepo = memoryRepoMock();
    const clientRepo = clientRepoMock();
    const useCase = new AddClientMemoryUseCase(memoryRepo, clientRepo);

    const result = await useCase.execute(businessId, clientId, { content: "Le gusta el color azul" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.content).toBe("Le gusta el color azul");
    expect(memoryRepo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when the client does not exist", async () => {
    const memoryRepo = memoryRepoMock();
    const clientRepo = clientRepoMock({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new AddClientMemoryUseCase(memoryRepo, clientRepo);

    const result = await useCase.execute(businessId, "missing", { content: "Algo" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(memoryRepo.save).not.toHaveBeenCalled();
  });

  it("fails with a domain error for empty content", async () => {
    const memoryRepo = memoryRepoMock();
    const clientRepo = clientRepoMock();
    const useCase = new AddClientMemoryUseCase(memoryRepo, clientRepo);

    const result = await useCase.execute(businessId, clientId, { content: "  " });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(memoryRepo.save).not.toHaveBeenCalled();
  });
});

describe("ListClientMemoriesUseCase", () => {
  it("lists memory entries for an existing client", async () => {
    const memory = ClientMemory.create({ businessId, clientId, content: "Nombre: Juan" }).value;
    const memoryRepo = memoryRepoMock({ findByClientId: vi.fn().mockResolvedValue([memory]) });
    const clientRepo = clientRepoMock();
    const useCase = new ListClientMemoriesUseCase(memoryRepo, clientRepo);

    const result = await useCase.execute(businessId, clientId);

    expect(result.isSuccess).toBe(true);
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.content).toBe("Nombre: Juan");
  });

  it("fails with NotFoundError when the client does not exist", async () => {
    const memoryRepo = memoryRepoMock();
    const clientRepo = clientRepoMock({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new ListClientMemoriesUseCase(memoryRepo, clientRepo);

    const result = await useCase.execute(businessId, "missing");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});

describe("DeleteClientMemoryUseCase", () => {
  it("deletes an existing memory entry", async () => {
    const memory = ClientMemory.create({ businessId, clientId, content: "Algo" }).value;
    const memoryRepo = memoryRepoMock({ findById: vi.fn().mockResolvedValue(memory) });
    const useCase = new DeleteClientMemoryUseCase(memoryRepo);

    const result = await useCase.execute(businessId, memory.id);

    expect(result.isSuccess).toBe(true);
    expect(memoryRepo.delete).toHaveBeenCalledWith(businessId, memory.id);
  });

  it("fails with NotFoundError when the memory entry does not exist", async () => {
    const memoryRepo = memoryRepoMock();
    const useCase = new DeleteClientMemoryUseCase(memoryRepo);

    const result = await useCase.execute(businessId, "missing");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(memoryRepo.delete).not.toHaveBeenCalled();
  });
});
