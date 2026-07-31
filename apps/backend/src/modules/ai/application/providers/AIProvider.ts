import type { AITool } from "../tools/AITool.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateTextInput {
  systemPrompt: string;
  messages: ChatMessage[];
  tools?: AITool[];
}

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<string>;
  transcribeAudio(audio: Buffer, mimeType: string): Promise<string>;
  /** Vector de embedding para RAG. La dimensión depende del modelo del proveedor. */
  embedText(text: string): Promise<number[]>;
}
