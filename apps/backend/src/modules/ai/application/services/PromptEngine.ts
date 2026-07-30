export interface PromptEngineOptions {
  canSearchProducts?: boolean;
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

    return parts.join(" ");
  }
}
