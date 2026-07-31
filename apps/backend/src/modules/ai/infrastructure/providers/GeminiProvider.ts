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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Debe producir la misma dimensión que el `vector(1536)` de la migración de
 * document_chunks, que quedó fijada por `text-embedding-3-small` de OpenAI.
 * `gemini-embedding-001` genera 3072 por defecto pero admite recortar la
 * salida (Matryoshka), así que se le pide 1536 explícitamente en vez de migrar
 * el esquema. Ojo: esto hace que los vectores *quepan*, no que sean
 * comparables con los de OpenAI — cambiar de proveedor obliga a reindexar.
 */
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 1536;

const MAX_TOOL_ROUNDS = 5;

const VISION_PROMPT =
  "Describí brevemente esta imagen en español, en un párrafo corto. " +
  "Si contiene texto legible (carteles, etiquetas, precios, documentos), transcribilo textualmente. " +
  "Si no hay texto visible, no lo menciones.";

const TRANSCRIPTION_PROMPT =
  "Transcribí textualmente el audio a español. Devolvé únicamente la transcripción, sin comentarios.";

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown>;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{ content?: GeminiContent }>;
}

interface GeminiEmbedContentResponse {
  embedding?: { values: number[] };
}

const QUICK_REPLIES_DECLARATION: GeminiFunctionDeclaration = {
  name: QUICK_REPLIES_TOOL_NAME,
  description: QUICK_REPLIES_TOOL_DESCRIPTION,
  parameters: QUICK_REPLIES_TOOL_PARAMETERS,
};

export class GeminiProvider implements AIProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string,
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    this.requireApiKey();

    const tools = input.tools ?? [];
    const declarations: GeminiFunctionDeclaration[] = [
      ...tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
      QUICK_REPLIES_DECLARATION,
    ];

    // Gemini nombra "model" al rol que OpenAI llama "assistant".
    const contents: GeminiContent[] = input.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const content = await this.requestContent(contents, declarations, input.systemPrompt);
      const parts = content.parts ?? [];
      const functionCalls = parts
        .map((part) => part.functionCall)
        .filter((call): call is GeminiFunctionCall => call !== undefined);

      if (functionCalls.length === 0) {
        const text = parts
          .map((part) => part.text ?? "")
          .join("")
          .trim();
        if (!text) {
          throw new Error("Gemini API returned no content");
        }
        return { text };
      }

      const quickRepliesCall = functionCalls.find((call) => call.name === QUICK_REPLIES_TOOL_NAME);
      if (quickRepliesCall) {
        try {
          return parseQuickRepliesArgs(quickRepliesCall.args ?? {});
        } catch {
          throw new Error(`Gemini returned malformed arguments for ${QUICK_REPLIES_TOOL_NAME}`);
        }
      }

      contents.push({ role: "model", parts });

      const responseParts: GeminiPart[] = [];
      for (const call of functionCalls) {
        const result = await this.executeToolCall(tools, call);
        responseParts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      }
      // Los resultados de herramientas viajan como turno del usuario: Gemini no
      // tiene un rol "tool" separado como OpenAI.
      contents.push({ role: "user", parts: responseParts });
    }

    throw new Error(`Gemini tool calling exceeded ${MAX_TOOL_ROUNDS} rounds`);
  }

  async transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
    this.requireApiKey();

    // Gemini es multimodal nativo: el audio va en la misma llamada de
    // generación, sin un endpoint aparte como el whisper-1 de OpenAI.
    const content = await this.requestContent([
      {
        role: "user",
        parts: [
          { text: TRANSCRIPTION_PROMPT },
          { inlineData: { mimeType, data: audio.toString("base64") } },
        ],
      },
    ]);

    return this.extractText(content, "Gemini audio transcription returned no content");
  }

  async describeImage(image: Buffer, mimeType: string): Promise<string> {
    this.requireApiKey();

    const content = await this.requestContent([
      {
        role: "user",
        parts: [
          { text: VISION_PROMPT },
          { inlineData: { mimeType, data: image.toString("base64") } },
        ],
      },
    ]);

    return this.extractText(content, "Gemini vision returned no content");
  }

  async embedText(text: string): Promise<number[]> {
    this.requireApiKey();

    const response = await fetch(`${GEMINI_API_BASE}/${EMBEDDING_MODEL}:embedContent`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      throw await apiHttpError(response, "Gemini embeddings request");
    }

    const data = (await response.json()) as GeminiEmbedContentResponse;
    const values = data.embedding?.values;
    if (!values || values.length === 0) {
      throw new Error("Gemini embeddings API returned no data");
    }
    return normalize(values);
  }

  private requireApiKey(): string {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return this.apiKey;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      // En header y no como `?key=` para que la credencial no termine en los
      // logs de acceso de ningún intermediario.
      "x-goog-api-key": this.requireApiKey(),
    };
  }

  private async requestContent(
    contents: GeminiContent[],
    declarations?: GeminiFunctionDeclaration[],
    systemPrompt?: string,
  ): Promise<GeminiContent> {
    const response = await fetch(`${GEMINI_API_BASE}/${this.model}:generateContent`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        contents,
        ...(systemPrompt && { systemInstruction: { parts: [{ text: systemPrompt }] } }),
        ...(declarations &&
          declarations.length > 0 && { tools: [{ functionDeclarations: declarations }] }),
      }),
    });

    if (!response.ok) {
      throw await apiHttpError(response, "Gemini API request");
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const content = data.candidates?.[0]?.content;
    if (!content) {
      throw new Error("Gemini API returned no candidates");
    }
    return content;
  }

  private extractText(content: GeminiContent, errorMessage: string): string {
    const text = (content.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) {
      throw new Error(errorMessage);
    }
    return text;
  }

  private async executeToolCall(tools: AITool[], call: GeminiFunctionCall): Promise<string> {
    const tool = tools.find((t) => t.name === call.name);
    if (!tool) {
      return `Error: tool "${call.name}" not found`;
    }

    try {
      return await tool.execute(call.args ?? {});
    } catch {
      return `Error: tool "${tool.name}" failed to execute`;
    }
  }
}

/**
 * Recortar un embedding de Gemini a menos dimensiones que las nativas deja el
 * vector sin normalizar, y Google recomienda renormalizarlo. La búsqueda por
 * coseno de pgvector normaliza internamente, así que esto no cambia el
 * ranking, pero mantiene los vectores en la forma que documenta el proveedor.
 */
function normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return magnitude === 0 ? values : values.map((v) => v / magnitude);
}
