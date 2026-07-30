import { describe, it, expect, vi } from "vitest";
import { createGuardarMemoriaTool } from "@modules/memory/application/tools/GuardarMemoriaTool.js";
import { createBuscarMemoriaTool } from "@modules/memory/application/tools/BuscarMemoriaTool.js";
import { ClientMemory } from "@modules/memory/domain/ClientMemory.js";
import type { IClientMemoryRepository } from "@modules/memory/application/repositories/IClientMemoryRepository.js";

const businessId = "b1";
const clientId = "c1";

function repoMock(overrides: Partial<IClientMemoryRepository> = {}): IClientMemoryRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByClientId: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("createGuardarMemoriaTool", () => {
  it("saves a valid memory fact scoped to the client", async () => {
    const repo = repoMock();
    const tool = createGuardarMemoriaTool(repo, businessId, clientId);

    const output = await tool.execute({ content: "Prefiere pagar con transferencia" });

    expect(output).toBe("Dato guardado correctamente.");
    expect(repo.save).toHaveBeenCalledOnce();
    const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0]![0] as ClientMemory;
    expect(saved.businessId).toBe(businessId);
    expect(saved.clientId).toBe(clientId);
    expect(saved.content).toBe("Prefiere pagar con transferencia");
  });

  it("returns an error message instead of throwing for invalid content", async () => {
    const repo = repoMock();
    const tool = createGuardarMemoriaTool(repo, businessId, clientId);

    const output = await tool.execute({ content: "" });

    expect(output).toContain("Error");
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("createBuscarMemoriaTool", () => {
  it("returns saved facts scoped to the client as JSON", async () => {
    const memory = ClientMemory.create({ businessId, clientId, content: "Nombre: Ana" }).value;
    const repo = repoMock({ findByClientId: vi.fn().mockResolvedValue([memory]) });
    const tool = createBuscarMemoriaTool(repo, businessId, clientId);

    const output = await tool.execute({});

    expect(repo.findByClientId).toHaveBeenCalledWith(businessId, clientId, 20);
    expect(JSON.parse(output)).toEqual(["Nombre: Ana"]);
  });

  it("returns a human message when there is nothing saved yet", async () => {
    const repo = repoMock();
    const tool = createBuscarMemoriaTool(repo, businessId, clientId);

    const output = await tool.execute({});

    expect(output).toBe("No hay datos guardados sobre este cliente todavía.");
  });
});
