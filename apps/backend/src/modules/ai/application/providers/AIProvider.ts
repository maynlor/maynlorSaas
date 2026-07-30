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
}
