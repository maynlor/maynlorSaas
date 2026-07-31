import { OpenAIProvider } from "./infrastructure/providers/OpenAIProvider.js";
import { GeminiProvider } from "./infrastructure/providers/GeminiProvider.js";
import type { AIProvider } from "./application/providers/AIProvider.js";

export type AIProviderName = "openai" | "gemini";

export interface AIModuleConfig {
  provider?: AIProviderName;
  openaiApiKey: string | undefined;
  openaiModel: string;
  geminiApiKey?: string | undefined;
  geminiModel?: string;
}

const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

/**
 * Único punto donde se elige el proveedor: el resto del sistema depende solo
 * de la interfaz `AIProvider`, así que cambiar de proveedor es cambiar la
 * variable `AI_PROVIDER`, no tocar código.
 *
 * Ojo con los embeddings del RAG: los vectores de proveedores distintos no son
 * comparables entre sí aunque tengan la misma dimensión, así que cambiar de
 * proveedor obliga a reindexar los documentos ya cargados.
 */
export function createAIProvider(config: AIModuleConfig, override?: AIProvider): AIProvider {
  if (override) return override;

  return config.provider === "gemini"
    ? new GeminiProvider(config.geminiApiKey, config.geminiModel ?? DEFAULT_GEMINI_MODEL)
    : new OpenAIProvider(config.openaiApiKey, config.openaiModel);
}
