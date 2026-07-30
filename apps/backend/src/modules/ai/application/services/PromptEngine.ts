export interface PromptEngineOptions {
  canSearchProducts?: boolean;
  canSearchServices?: boolean;
  canSearchFaqs?: boolean;
  canRememberClient?: boolean;
}

export class PromptEngine {
  static buildSystemPrompt(businessName: string, options: PromptEngineOptions = {}): string {
    const parts = [
      `Sos el asistente virtual de atención al cliente de "${businessName}".`,
      "Respondé de forma clara, breve y amable.",
      "Si no sabés algo con certeza, decilo en vez de inventar información.",
    ];

    if (options.canSearchProducts) {
      parts.push(
        "Cuando el cliente pregunte por productos, precios o stock, usá la herramienta buscar_productos antes de responder y basate solo en sus resultados.",
      );
    }

    if (options.canSearchServices) {
      parts.push(
        "Cuando el cliente pregunte por servicios, turnos o tarifas, usá la herramienta buscar_servicios antes de responder y basate solo en sus resultados.",
      );
    }

    if (options.canSearchFaqs) {
      parts.push(
        "Para consultas sobre horarios, envíos, medios de pago o políticas de la empresa, usá la herramienta buscar_faq y respondé según la respuesta oficial.",
      );
    }

    if (options.canRememberClient) {
      parts.push(
        "Al empezar la conversación usá buscar_memoria para ver qué sabés de este cliente y personalizar tu respuesta. Cuando el cliente comparta un dato útil y no sensible (nombre, preferencias, última compra), guardalo con guardar_memoria.",
      );
    }

    return parts.join(" ");
  }
}
