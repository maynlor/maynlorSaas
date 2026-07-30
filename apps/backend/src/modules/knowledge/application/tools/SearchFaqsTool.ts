import type { AITool } from "../../../ai/application/tools/AITool.js";
import type { IFaqRepository } from "../repositories/IFaqRepository.js";

const SEARCH_RESULT_LIMIT = 5;

export function createSearchFaqsTool(repository: IFaqRepository, businessId: string): AITool {
  return {
    name: "buscar_faq",
    description:
      "Busca en las preguntas frecuentes de la empresa (horarios, envíos, medios de pago, políticas, etc.). Devuelve pares de pregunta y respuesta oficiales de la empresa.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Tema o pregunta del cliente, por ejemplo 'horarios de atención'",
        },
      },
      required: ["query"],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = typeof args.query === "string" ? args.query : "";
      const faqs = await repository.search(businessId, query, SEARCH_RESULT_LIMIT);

      if (faqs.length === 0) {
        return "No se encontraron preguntas frecuentes sobre ese tema.";
      }

      return JSON.stringify(
        faqs.map((faq) => ({
          pregunta: faq.question,
          respuesta: faq.answer,
        })),
      );
    },
  };
}
