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

export interface GenerateTextResult {
  text: string;
  /**
   * Opciones cortas de respuesta rápida que el modelo decidió ofrecer en vez
   * de (o adelante de) texto libre — ej. para que WhatsApp las muestre como
   * botones. Ausente cuando la respuesta es texto plano normal.
   */
  quickReplies?: string[];
}

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  transcribeAudio(audio: Buffer, mimeType: string): Promise<string>;
  /** Descripción en texto de una imagen, incluyendo cualquier texto legible que contenga (equivalente a OCR). */
  describeImage(image: Buffer, mimeType: string): Promise<string>;
  /** Vector de embedding para RAG. La dimensión depende del modelo del proveedor. */
  embedText(text: string): Promise<number[]>;
}
