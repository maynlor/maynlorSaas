export interface PromptEngineOptions {
  canSearchProducts?: boolean;
  canSearchServices?: boolean;
  canSearchFaqs?: boolean;
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

    return parts.join(" ");
  }
}
