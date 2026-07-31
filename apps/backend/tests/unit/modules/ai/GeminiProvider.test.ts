import { describe, it, expect, vi, afterEach } from "vitest";
import { GeminiProvider } from "@modules/ai/infrastructure/providers/GeminiProvider.js";
import type { AITool } from "@modules/ai/application/tools/AITool.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

interface GeminiPartLike {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

function candidate(parts: GeminiPartLike[]): unknown {
  return { candidates: [{ content: { role: "model", parts } }] };
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): Record<string, never> {
  const call = fetchMock.mock.calls[callIndex] as [string, { body: string }];
  return JSON.parse(call[1].body) as Record<string, never>;
}

function requestUrl(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): string {
  return (fetchMock.mock.calls[callIndex] as [string, unknown])[0];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeminiProvider.generateText", () => {
  it("returns the text and sends the system prompt as systemInstruction", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(candidate([{ text: "Hola" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({ systemPrompt: "sos un asistente", messages: [] });

    expect(reply.text).toBe("Hola");
    const body = requestBody(fetchMock, 0) as unknown as {
      systemInstruction: { parts: { text: string }[] };
      tools: { functionDeclarations: { name: string }[] }[];
    };
    // A diferencia de OpenAI, el prompt de sistema no va como un mensaje más.
    expect(body.systemInstruction.parts[0]!.text).toBe("sos un asistente");
    // La herramienta terminal de botones va siempre, aun sin tools de negocio.
    expect(body.tools[0]!.functionDeclarations).toHaveLength(1);
    expect(body.tools[0]!.functionDeclarations[0]!.name).toBe("responder_con_opciones");
  });

  it("maps the assistant role to Gemini's \"model\" role", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(candidate([{ text: "ok" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    await provider.generateText({
      systemPrompt: "sys",
      messages: [
        { role: "user", content: "hola" },
        { role: "assistant", content: "¿en qué te ayudo?" },
      ],
    });

    const body = requestBody(fetchMock, 0) as unknown as { contents: { role: string }[] };
    expect(body.contents.map((c) => c.role)).toEqual(["user", "model"]);
  });

  it("joins multiple text parts of a single response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(candidate([{ text: "Hola " }, { text: "mundo" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [] });

    expect(reply.text).toBe("Hola mundo");
  });

  it("executes function calls and feeds results back until a final answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          candidate([{ functionCall: { name: "buscar_productos", args: { query: "remera" } } }]),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(candidate([{ text: "Tenemos remeras a $100" }])));
    vi.stubGlobal("fetch", fetchMock);

    const tool: AITool = {
      name: "buscar_productos",
      description: "busca",
      parameters: { type: "object", properties: {} },
      execute: vi.fn().mockResolvedValue('[{"nombre":"Remera","precio":100}]'),
    };

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({
      systemPrompt: "sys",
      messages: [{ role: "user", content: "¿Tienen remeras?" }],
      tools: [tool],
    });

    expect(reply.text).toBe("Tenemos remeras a $100");
    expect(tool.execute).toHaveBeenCalledWith({ query: "remera" });

    const secondBody = requestBody(fetchMock, 1) as unknown as {
      contents: { role: string; parts: { functionResponse?: { name: string; response: { result: string } } }[] }[];
    };
    // El resultado vuelve como turno del usuario: Gemini no tiene rol "tool".
    const toolTurn = secondBody.contents.at(-1)!;
    expect(toolTurn.role).toBe("user");
    expect(toolTurn.parts[0]!.functionResponse!.name).toBe("buscar_productos");
    expect(toolTurn.parts[0]!.functionResponse!.response.result).toContain("Remera");
  });

  it("reports an unknown tool back to the model instead of crashing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(candidate([{ functionCall: { name: "desconocida", args: {} } }])),
      )
      .mockResolvedValueOnce(jsonResponse(candidate([{ text: "No pude consultar eso" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [], tools: [] });

    expect(reply.text).toBe("No pude consultar eso");
    const secondBody = requestBody(fetchMock, 1) as unknown as {
      contents: { parts: { functionResponse?: { response: { result: string } } }[] }[];
    };
    expect(secondBody.contents.at(-1)!.parts[0]!.functionResponse!.response.result).toContain("not found");
  });

  it("fails after too many tool rounds", async () => {
    // mockImplementation y no mockResolvedValue: el body de un Response solo se
    // puede leer una vez, así que cada ronda necesita una respuesta nueva.
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse(candidate([{ functionCall: { name: "loop", args: {} } }]))),
      );
    vi.stubGlobal("fetch", fetchMock);

    const tool: AITool = {
      name: "loop",
      description: "loop",
      parameters: { type: "object", properties: {} },
      execute: vi.fn().mockResolvedValue("ok"),
    };

    const provider = new GeminiProvider("key", "gemini-test");
    await expect(
      provider.generateText({ systemPrompt: "sys", messages: [], tools: [tool] }),
    ).rejects.toThrow(/exceeded/);
  });

  it("throws when the API key is missing", async () => {
    const provider = new GeminiProvider(undefined, "gemini-test");
    await expect(provider.generateText({ systemPrompt: "sys", messages: [] })).rejects.toThrow(
      /GEMINI_API_KEY/,
    );
  });

  it("throws when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const provider = new GeminiProvider("key", "gemini-test");
    await expect(provider.generateText({ systemPrompt: "sys", messages: [] })).rejects.toThrow(
      /status 500/,
    );
  });
});

describe("GeminiProvider quick replies (responder_con_opciones)", () => {
  it("returns quickReplies when the model calls the terminal tool", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        candidate([
          {
            functionCall: {
              name: "responder_con_opciones",
              args: { mensaje: "¿Cuál preferís?", opciones: ["Rojo", "Azul", "Verde"] },
            },
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [] });

    expect(reply.text).toBe("¿Cuál preferís?");
    expect(reply.quickReplies).toEqual(["Rojo", "Azul", "Verde"]);
    // Terminal: corta el bucle, no encadena otra ronda.
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("caps quickReplies at 3 options even if the model returns more", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        candidate([
          {
            functionCall: {
              name: "responder_con_opciones",
              args: { mensaje: "Elegí", opciones: ["A", "B", "C", "D"] },
            },
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [] });

    expect(reply.quickReplies).toEqual(["A", "B", "C"]);
  });

  it("throws when the terminal tool call has malformed arguments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        candidate([{ functionCall: { name: "responder_con_opciones", args: { mensaje: "sin opciones" } } }]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    await expect(provider.generateText({ systemPrompt: "sys", messages: [] })).rejects.toThrow(
      /responder_con_opciones/,
    );
  });
});

describe("GeminiProvider.describeImage", () => {
  it("sends the image as inline base64 data alongside the vision prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(candidate([{ text: "Una remera azul" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const description = await provider.describeImage(Buffer.from("fake-image-bytes"), "image/jpeg");

    expect(description).toBe("Una remera azul");
    const body = requestBody(fetchMock, 0) as unknown as {
      contents: { parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
    };
    const parts = body.contents[0]!.parts;
    expect(parts[0]!.text).toContain("imagen");
    expect(parts[1]!.inlineData).toEqual({
      mimeType: "image/jpeg",
      data: Buffer.from("fake-image-bytes").toString("base64"),
    });
  });

  it("throws when the API key is missing", async () => {
    const provider = new GeminiProvider(undefined, "gemini-test");
    await expect(provider.describeImage(Buffer.from("x"), "image/jpeg")).rejects.toThrow(
      /GEMINI_API_KEY/,
    );
  });

  it("throws when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const provider = new GeminiProvider("key", "gemini-test");
    await expect(provider.describeImage(Buffer.from("x"), "image/jpeg")).rejects.toThrow(/status 500/);
  });
});

describe("GeminiProvider.transcribeAudio", () => {
  it("sends the audio inline in the same generation call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(candidate([{ text: "Quiero saber el horario" }])));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    const transcript = await provider.transcribeAudio(Buffer.from("audio-bytes"), "audio/ogg");

    expect(transcript).toBe("Quiero saber el horario");
    const body = requestBody(fetchMock, 0) as unknown as {
      contents: { parts: { inlineData?: { mimeType: string; data: string } }[] }[];
    };
    expect(body.contents[0]!.parts[1]!.inlineData).toEqual({
      mimeType: "audio/ogg",
      data: Buffer.from("audio-bytes").toString("base64"),
    });
  });

  it("throws when the API key is missing", async () => {
    const provider = new GeminiProvider(undefined, "gemini-test");
    await expect(provider.transcribeAudio(Buffer.from("x"), "audio/ogg")).rejects.toThrow(
      /GEMINI_API_KEY/,
    );
  });
});

describe("GeminiProvider.embedText", () => {
  it("requests 1536 dimensions to match the document_chunks schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ embedding: { values: [3, 4] } }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("key", "gemini-test");
    await provider.embedText("hola mundo");

    const body = requestBody(fetchMock, 0) as unknown as {
      outputDimensionality: number;
      content: { parts: { text: string }[] };
    };
    // Debe coincidir con el vector(1536) de la migración: pedir otra dimensión
    // haría fallar el INSERT de los chunks.
    expect(body.outputDimensionality).toBe(1536);
    expect(body.content.parts[0]!.text).toBe("hola mundo");
    expect(requestUrl(fetchMock, 0)).toContain("gemini-embedding-001:embedContent");
  });

  it("normalizes the returned vector", async () => {
    // Recortar a menos dimensiones que las nativas deja el vector sin
    // normalizar; Google recomienda renormalizarlo.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ embedding: { values: [3, 4] } })));

    const provider = new GeminiProvider("key", "gemini-test");
    const embedding = await provider.embedText("hola");

    expect(embedding).toEqual([0.6, 0.8]);
  });

  it("throws when the API key is missing", async () => {
    const provider = new GeminiProvider(undefined, "gemini-test");
    await expect(provider.embedText("hola")).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("throws when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const provider = new GeminiProvider("key", "gemini-test");
    await expect(provider.embedText("hola")).rejects.toThrow(/status 500/);
  });
});
