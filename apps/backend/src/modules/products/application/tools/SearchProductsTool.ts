import type { AITool } from "../../../ai/application/tools/AITool.js";
import type { IProductRepository } from "../repositories/IProductRepository.js";

const SEARCH_RESULT_LIMIT = 10;

export function createSearchProductsTool(
  repository: IProductRepository,
  businessId: string,
): AITool {
  return {
    name: "buscar_productos",
    description:
      "Busca productos del catálogo de la empresa por nombre o descripción. Devuelve nombre, descripción, precio, moneda y stock de cada producto encontrado.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Término de búsqueda, por ejemplo el nombre del producto que menciona el cliente",
        },
      },
      required: ["query"],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const query = typeof args.query === "string" ? args.query : "";
      const products = await repository.search(businessId, query, SEARCH_RESULT_LIMIT);

      if (products.length === 0) {
        return "No se encontraron productos para esa búsqueda.";
      }

      return JSON.stringify(
        products.map((product) => ({
          nombre: product.name,
          descripcion: product.description,
          precio: product.price,
          moneda: product.currency,
          stock: product.stock,
        })),
      );
    },
  };
}
