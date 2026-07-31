import type {
  AIProvider,
  GenerateTextInput,
  GenerateTextResult,
} from "../../application/providers/AIProvider.js";
import type { AITool } from "../../application/tools/AITool.js";
import {
  QUICK_REPLIES_TOOL_NAME,
  QUICK_REPLIES_TOOL_DESCRIPTION,
  QUICK_REPLIES_TOOL_PARAMETERS,
  parseQuickRepliesArgs,
} from "../../application/tools/QuickRepliesTool.js";
import { apiHttpError } from "../../../../shared/http/apiHttpError.js";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_AUDIO_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
// Debe coincidir con el vector(1536) de la migración de document_chunks:
// cambiar de modelo exige una migración para ajustar la dimensión guardada.
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_TOOL_ROUNDS = 5;
const VISION_PROMPT =
  "Describí brevemente esta imagen en español, en un párrafo corto. " +
  "Si contiene texto legible (carteles, etiquetas, precios, documentos), transcribilo textualmente. " +
  "Si no hay texto visible, no lo menciones.";

/** Siempre disponible, independiente de qué tools de negocio se hayan inyectado. */
const QUICK_REPLIES_TOOL_SCHEMA: OpenAIToolSchema = {
  type: "function",
  function: {
    name: QUICK_REPLIES_TOOL_NAME,
    description: QUICK_REPLIES_TOOL_DESCRIPTION,
    parameters: QUICK_REPLIES_TOOL_PARAMETERS,
  },
};

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIToolSchema {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
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

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const tools = input.tools ?? [];
    const toolSchemas: OpenAIToolSchema[] = [
      ...tools.map((tool) => ({
        type: "function" as const,
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
      })),
      QUICK_REPLIES_TOOL_SCHEMA,
    ];
    const messages: OpenAIMessage[] = [
      { role: "system", content: input.systemPrompt },
      ...input.messages.map((m): OpenAIMessage => ({ role: m.role, content: m.content })),
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const message = await this.requestCompletion(messages, toolSchemas);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (!message.content) {
          throw new Error("OpenAI API returned no content");
        }
        return { text: message.content };
      }

      const quickRepliesCall = message.tool_calls.find(
        (call) => call.function.name === QUICK_REPLIES_TOOL_NAME,
      );
      if (quickRepliesCall) {
        return this.parseQuickRepliesCall(quickRepliesCall);
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

  private parseQuickRepliesCall(toolCall: OpenAIToolCall): GenerateTextResult {
    try {
      return parseQuickRepliesArgs(JSON.parse(toolCall.function.arguments) as Record<string, unknown>);
    } catch {
      throw new Error(`OpenAI returned malformed arguments for ${QUICK_REPLIES_TOOL_NAME}`);
    }
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
      throw await apiHttpError(response, "OpenAI audio transcription");
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
      throw await apiHttpError(response, "OpenAI embeddings request");
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = data.data[0]?.embedding;
    if (!embedding) {
      throw new Error("OpenAI embeddings API returned no data");
    }
    return embedding;
  }

  async describeImage(image: Buffer, mimeType: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      // Formato de contenido multi-parte (texto + imagen): distinto del array
      // plano de OpenAIMessage que usa el resto del provider, así que se arma
      // el body a mano en vez de reusar requestCompletion.
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw await apiHttpError(response, "OpenAI vision request");
    }

    const data = (await response.json()) as OpenAIChatCompletionResponse;
    const content = data.choices[0]?.message.content;
    if (!content) {
      throw new Error("OpenAI vision API returned no content");
    }
    return content;
  }

  private async requestCompletion(
    messages: OpenAIMessage[],
    tools: OpenAIToolSchema[],
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
        ...(tools.length > 0 && { tools }),
      }),
    });

    if (!response.ok) {
      throw await apiHttpError(response, "OpenAI API request");
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
