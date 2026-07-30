import type { AITool } from "../../../ai/application/tools/AITool.js";
import { ClientMemory } from "../../domain/ClientMemory.js";
import type { IClientMemoryRepository } from "../repositories/IClientMemoryRepository.js";

export function createGuardarMemoriaTool(
  repository: IClientMemoryRepository,
  businessId: string,
  clientId: string,
): AITool {
  return {
    name: "guardar_memoria",
    description:
      "Guarda un dato breve y útil sobre este cliente para recordarlo en futuras conversaciones (nombre, preferencias, última compra, etc). Nunca guardes contraseñas, datos de tarjetas, documentos de identidad u otra información sensible.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "El dato a recordar, en una oración breve. Ej: 'Prefiere entrega por la tarde'.",
        },
      },
      required: ["content"],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const content = typeof args.content === "string" ? args.content : "";
      const result = ClientMemory.create({ businessId, clientId, content });
      if (result.isFailure) {
        return `Error: ${result.error.message}`;
      }

      await repository.save(result.value);
      return "Dato guardado correctamente.";
    },
  };
}
