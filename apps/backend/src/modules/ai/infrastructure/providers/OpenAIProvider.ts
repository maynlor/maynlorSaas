import type { AIProvider, GenerateTextInput } from "../../application/providers/AIProvider.js";
import type { AITool } from "../../application/tools/AITool.js";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_AUDIO_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
// Debe coincidir con el vector(1536) de la migración de document_chunks:
// cambiar de modelo exige una migración para ajustar la dimensión guardada.
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_TOOL_ROUNDS = 5;

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIChatCompletionResponse {
  choices: Array<{ message: { content: string | null; tool_calls?: OpenAIToolCall[] } }>;
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async generateText(input: GenerateTextInput): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const tools = input.tools ?? [];
    const messages: OpenAIMessage[] = [
      { role: "system", content: input.systemPrompt },
      ...input.messages.map((m): OpenAIMessage => ({ role: m.role, content: m.content })),
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const message = await this.requestCompletion(messages, tools);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (!message.content) {
          throw new Error("OpenAI API returned no content");
        }
        return message.content;
      }

      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const result = await this.executeToolCall(tools, toolCall);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }
    }

    throw new Error(`OpenAI tool calling exceeded ${MAX_TOOL_ROUNDS} rounds`);
  }

  async transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("file", new Blob([audio], { type: mimeType }), "audio");

    const response = await fetch(OPENAI_AUDIO_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`OpenAI audio transcription failed with status ${response.status}`);
    }

    const data = (await response.json()) as { text: string };
    return data.text;
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = data.data[0]?.embedding;
    if (!embedding) {
      throw new Error("OpenAI embeddings API returned no data");
    }
    return embedding;
  }

  private async requestCompletion(
    messages: OpenAIMessage[],
    tools: AITool[],
  ): Promise<{ content: string | null; tool_calls?: OpenAIToolCall[] }> {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(tools.length > 0 && {
          tools: tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
        }),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenAIChatCompletionResponse;
    const message = data.choices[0]?.message;
    if (!message) {
      throw new Error("OpenAI API returned no choices");
    }
    return message;
  }

  private async executeToolCall(tools: AITool[], toolCall: OpenAIToolCall): Promise<string> {
    const tool = tools.find((t) => t.name === toolCall.function.name);
    if (!tool) {
      return `Error: tool "${toolCall.function.name}" not found`;
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    } catch {
      return "Error: tool arguments are not valid JSON";
    }

    try {
      return await tool.execute(args);
    } catch {
      return `Error: tool "${tool.name}" failed to execute`;
    }
  }
}
