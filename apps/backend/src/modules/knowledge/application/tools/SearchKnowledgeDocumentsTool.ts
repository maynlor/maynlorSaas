import type { AITool } from "../../../ai/application/tools/AITool.js";
import type { AIProvider } from "../../../ai/application/providers/AIProvider.js";
import type { IDocumentChunkRepository } from "../repositories/IDocumentChunkRepository.js";

const SEARCH_RESULT_LIMIT = 5;
// Umbral mínimo de similitud coseno para descartar fragmentos poco relevantes.
// No hay re-ranking en esta primera versión; es un filtro burdo, no una
// garantía de relevancia real.
const MIN_SIMILARITY = 0.3;

export function createSearchKnowledgeDocumentsTool(
  repository: IDocumentChunkRepository,
  aiProvider: AIProvider,
  businessId: string,
): AITool {
  return {
    name: "buscar_documentos",
    description:
      "Busca por significado en los documentos de conocimiento de la empresa (catálogos, manuales, políticas cargadas como texto libre o PDF). Usala para preguntas abiertas que no se resuelven con buscar_productos, buscar_servicios ni buscar_faq.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "La pregunta o tema del cliente, en sus propias palabras",
        },
      },
      required: ["query"],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = typeof args.query === "string" ? args.query : "";
      if (!query.trim()) {
        return "No se encontró información relevante en los documentos de la empresa.";
      }

      const queryEmbedding = await aiProvider.embedText(query);
      const results = await repository.searchSimilar(businessId, queryEmbedding, SEARCH_RESULT_LIMIT);
      const relevant = results.filter((r) => r.similarity >= MIN_SIMILARITY);

      if (relevant.length === 0) {
        return "No se encontró información relevante en los documentos de la empresa.";
      }

      return JSON.stringify(relevant.map((r) => ({ contenido: r.chunk.content })));
    },
  };
}
