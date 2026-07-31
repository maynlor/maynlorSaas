import type { GenerateTextResult } from "../providers/AIProvider.js";

// Límite real de WhatsApp para botones de respuesta rápida: como máximo 3.
export const MAX_QUICK_REPLIES = 3;

export const QUICK_REPLIES_TOOL_NAME = "responder_con_opciones";

export const QUICK_REPLIES_TOOL_DESCRIPTION =
  "Terminá tu respuesta ofreciendo hasta 3 opciones cortas para que el cliente elija con un toque, " +
  "en vez de escribir texto libre. Usala solo cuando tenga sentido ofrecer alternativas concretas y " +
  "excluyentes (confirmar algo, elegir entre productos puntuales, etc.), no para cualquier respuesta.";

export const QUICK_REPLIES_TOOL_PARAMETERS: Record<string, unknown> = {
  type: "object",
  properties: {
    mensaje: { type: "string", description: "El texto del mensaje, antes de mostrar las opciones" },
    opciones: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: MAX_QUICK_REPLIES,
      description: `Hasta ${MAX_QUICK_REPLIES} opciones cortas (máximo 20 caracteres cada una)`,
    },
  },
  required: ["mensaje", "opciones"],
};

/**
 * A diferencia de las AITool del negocio (buscar_productos, etc.), esta
 * herramienta no se ejecuta ni devuelve resultado al modelo — es "terminal":
 * cuando el modelo la llama, ahí termina la respuesta. Vive acá y no dentro de
 * un provider concreto porque cada proveedor la expone en su propio formato
 * (OpenAI la envuelve en `{type:"function"}`, Gemini en `functionDeclarations`)
 * pero el contrato con el modelo —nombre, descripción y forma de los
 * argumentos— tiene que ser idéntico en todos.
 */
export function parseQuickRepliesArgs(args: Record<string, unknown>): GenerateTextResult {
  const mensaje = args["mensaje"];
  const opciones = args["opciones"];

  if (typeof mensaje !== "string" || !mensaje || !Array.isArray(opciones) || opciones.length === 0) {
    throw new Error(`Model returned malformed arguments for ${QUICK_REPLIES_TOOL_NAME}`);
  }

  return {
    text: mensaje,
    quickReplies: opciones.filter((o): o is string => typeof o === "string").slice(0, MAX_QUICK_REPLIES),
  };
}
