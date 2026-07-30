import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAIProvider } from "@modules/ai/infrastructure/providers/OpenAIProvider.js";
import type { AITool } from "@modules/ai/application/tools/AITool.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function completion(message: Record<string, unknown>): unknown {
  return { choices: [{ message }] };
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): string {
  const call = fetchMock.mock.calls[callIndex] as [string, { body: string }];
  return call[1].body;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAIProvider", () => {
  it("returns the content directly when the model does not call tools", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(completion({ content: "Hola" })));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider("key", "gpt-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [] });

    expect(reply).toBe("Hola");
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(requestBody(fetchMock, 0));
    expect(body.tools).toBeUndefined();
  });

  it("executes tool calls and feeds results back until a final answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          completion({
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "buscar_productos", arguments: '{"query":"remera"}' },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(completion({ content: "Tenemos remeras a $100" })));
    vi.stubGlobal("fetch", fetchMock);

    const tool: AITool = {
      name: "buscar_productos",
      description: "busca",
      parameters: { type: "object", properties: {} },
      execute: vi.fn().mockResolvedValue('[{"nombre":"Remera","precio":100}]'),
    };

    const provider = new OpenAIProvider("key", "gpt-test");
    const reply = await provider.generateText({
      systemPrompt: "sys",
      messages: [{ role: "user", content: "¿Tienen remeras?" }],
      tools: [tool],
    });

    expect(reply).toBe("Tenemos remeras a $100");
    expect(tool.execute).toHaveBeenCalledWith({ query: "remera" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(requestBody(fetchMock, 0));
    expect(firstBody.tools).toHaveLength(1);
    expect(firstBody.tools[0].function.name).toBe("buscar_productos");

    const secondBody = JSON.parse(requestBody(fetchMock, 1));
    const toolMessage = secondBody.messages.find((m: { role: string }) => m.role === "tool");
    expect(toolMessage.tool_call_id).toBe("call_1");
    expect(toolMessage.content).toContain("Remera");
  });

  it("reports an unknown tool back to the model instead of crashing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          completion({
            content: null,
            tool_calls: [
              { id: "call_1", type: "function", function: { name: "desconocida", arguments: "{}" } },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(completion({ content: "No pude consultar eso" })));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIProvider("key", "gpt-test");
    const reply = await provider.generateText({ systemPrompt: "sys", messages: [], tools: [] });

    expect(reply).toBe("No pude consultar eso");
    const secondBody = JSON.parse(requestBody(fetchMock, 1));
    const toolMessage = secondBody.messages.find((m: { role: string }) => m.role === "tool");
    expect(toolMessage.content).toContain("not found");
  });

  it("fails after too many tool rounds", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse(
          completion({
            content: null,
            tool_calls: [
              { id: "call_x", type: "function", function: { name: "loop", arguments: "{}" } },
            ],
          }),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool: AITool = {
      name: "loop",
      description: "loop",
      parameters: { type: "object", properties: {} },
      execute: vi.fn().mockResolvedValue("ok"),
    };

    const provider = new OpenAIProvider("key", "gpt-test");
    await expect(
      provider.generateText({ systemPrompt: "sys", messages: [], tools: [tool] }),
    ).rejects.toThrow(/exceeded/);
  });

  it("throws when the API key is missing", async () => {
    const provider = new OpenAIProvider(undefined, "gpt-test");
    await expect(provider.generateText({ systemPrompt: "sys", messages: [] })).rejects.toThrow(
      /OPENAI_API_KEY/,
    );
  });
});
