import { OpenAIProvider } from "./infrastructure/providers/OpenAIProvider.js";
import type { AIProvider } from "./application/providers/AIProvider.js";

export interface AIModuleConfig {
  openaiApiKey: string | undefined;
  openaiModel: string;
}

export function createAIProvider(config: AIModuleConfig, override?: AIProvider): AIProvider {
  return override ?? new OpenAIProvider(config.openaiApiKey, config.openaiModel);
}
