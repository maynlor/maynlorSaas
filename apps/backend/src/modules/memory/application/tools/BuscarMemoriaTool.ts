import type { AITool } from "../../../ai/application/tools/AITool.js";
import type { IClientMemoryRepository } from "../repositories/IClientMemoryRepository.js";

const MEMORY_LIMIT = 20;

export function createBuscarMemoriaTool(
  repository: IClientMemoryRepository,
  businessId: string,
  clientId: string,
): AITool {
  return {
    name: "buscar_memoria",
    description:
      "Devuelve los datos guardados sobre este cliente en conversaciones anteriores (nombre, preferencias, última compra, etc). Usala al empezar la conversación para personalizar tu respuesta.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(): Promise<string> {
      const memories = await repository.findByClientId(businessId, clientId, MEMORY_LIMIT);

      if (memories.length === 0) {
        return "No hay datos guardados sobre este cliente todavía.";
      }

      return JSON.stringify(memories.map((memory) => memory.content));
    },
  };
}
