import type { AITool } from "../../../ai/application/tools/AITool.js";
import type { IServiceRepository } from "../repositories/IServiceRepository.js";

const SEARCH_RESULT_LIMIT = 10;

export function createSearchServicesTool(
  repository: IServiceRepository,
  businessId: string,
): AITool {
  return {
    name: "buscar_servicios",
    description:
      "Busca servicios que ofrece la empresa por nombre o descripción. Devuelve nombre, descripción, precio, moneda y duración en minutos de cada servicio encontrado.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Término de búsqueda, por ejemplo el servicio que menciona el cliente",
        },
      },
      required: ["query"],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = typeof args.query === "string" ? args.query : "";
      const services = await repository.search(businessId, query, SEARCH_RESULT_LIMIT);

      if (services.length === 0) {
        return "No se encontraron servicios para esa búsqueda.";
      }

      return JSON.stringify(
        services.map((service) => ({
          nombre: service.name,
          descripcion: service.description,
          precio: service.price,
          moneda: service.currency,
          duracionMinutos: service.durationMinutes,
        })),
      );
    },
  };
}
