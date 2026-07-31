import { describe, it, expect, vi } from "vitest";
import { createSearchKnowledgeDocumentsTool } from "@modules/knowledge/application/tools/SearchKnowledgeDocumentsTool.js";
import { DocumentChunk } from "@modules/knowledge/domain/DocumentChunk.js";
import type { IDocumentChunkRepository } from "@modules/knowledge/application/repositories/IDocumentChunkRepository.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";

const businessId = "b1";

function buildChunk(content: string): DocumentChunk {
  return DocumentChunk.create({ documentId: "d1", businessId, chunkIndex: 0, content, embedding: [0.1] });
}

function createAiProviderMock(): AIProvider {
  return {
    generateText: vi.fn(),
    transcribeAudio: vi.fn(),
    embedText: vi.fn().mockResolvedValue([0.5, 0.5]),
    describeImage: vi.fn(),
  };
}

describe("SearchKnowledgeDocumentsTool", () => {
  it("embeds the query and returns the relevant chunks as JSON", async () => {
    const repo: IDocumentChunkRepository = {
      saveMany: vi.fn(),
      deleteByDocumentId: vi.fn(),
      searchSimilar: vi.fn().mockResolvedValue([
        { chunk: buildChunk("Envíos a todo el país en 48hs"), similarity: 0.82 },
      ]),
    };
    const aiProvider = createAiProviderMock();
    const tool = createSearchKnowledgeDocumentsTool(repo, aiProvider, businessId);

    const result = await tool.execute({ query: "cuánto tardan los envíos" });

    expect(aiProvider.embedText).toHaveBeenCalledWith("cuánto tardan los envíos");
    expect(repo.searchSimilar).toHaveBeenCalledWith(businessId, [0.5, 0.5], 5);
    expect(JSON.parse(result)).toEqual([{ contenido: "Envíos a todo el país en 48hs" }]);
  });

  it("filters out chunks below the relevance threshold", async () => {
    const repo: IDocumentChunkRepository = {
      saveMany: vi.fn(),
      deleteByDocumentId: vi.fn(),
      searchSimilar: vi.fn().mockResolvedValue([
        { chunk: buildChunk("relevante"), similarity: 0.9 },
        { chunk: buildChunk("poco relacionado"), similarity: 0.1 },
      ]),
    };
    const tool = createSearchKnowledgeDocumentsTool(repo, createAiProviderMock(), businessId);

    const result = await tool.execute({ query: "algo" });

    expect(JSON.parse(result)).toEqual([{ contenido: "relevante" }]);
  });

  it("returns a not-found message when nothing clears the threshold", async () => {
    const repo: IDocumentChunkRepository = {
      saveMany: vi.fn(),
      deleteByDocumentId: vi.fn(),
      searchSimilar: vi.fn().mockResolvedValue([{ chunk: buildChunk("x"), similarity: 0.05 }]),
    };
    const tool = createSearchKnowledgeDocumentsTool(repo, createAiProviderMock(), businessId);

    const result = await tool.execute({ query: "algo" });

    expect(result).toMatch(/no se encontró/i);
  });

  it("returns a not-found message for an empty query without calling the provider", async () => {
    const aiProvider = createAiProviderMock();
    const repo: IDocumentChunkRepository = {
      saveMany: vi.fn(),
      deleteByDocumentId: vi.fn(),
      searchSimilar: vi.fn(),
    };
    const tool = createSearchKnowledgeDocumentsTool(repo, aiProvider, businessId);

    const result = await tool.execute({ query: "   " });

    expect(result).toMatch(/no se encontró/i);
    expect(aiProvider.embedText).not.toHaveBeenCalled();
  });
});
