import { describe, it, expect } from "vitest";
import { TextChunker } from "@modules/knowledge/application/services/TextChunker.js";

describe("TextChunker", () => {
  it("returns an empty array for empty or whitespace-only text", () => {
    expect(TextChunker.chunk("")).toEqual([]);
    expect(TextChunker.chunk("   \n\t  ")).toEqual([]);
  });

  it("returns a single chunk when the text fits within chunkSize", () => {
    const text = "Horario de atención: lunes a viernes de 9 a 18.";
    expect(TextChunker.chunk(text, { chunkSize: 800 })).toEqual([text]);
  });

  it("splits long text into multiple chunks", () => {
    const text = "palabra ".repeat(300); // ~2400 caracteres
    const chunks = TextChunker.chunk(text, { chunkSize: 800, overlap: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });

  it("does not split words in the middle when a space is available", () => {
    const text = "a".repeat(795) + " palabracompleta " + "b".repeat(795);
    const chunks = TextChunker.chunk(text, { chunkSize: 800, overlap: 50 });

    // Ninguna palabra de las originales debería aparecer partida en un chunk.
    const rejoined = chunks.join(" ");
    expect(rejoined).toContain("palabracompleta");
  });

  it("repeats the overlap between consecutive chunks", () => {
    const text = "uno dos tres cuatro cinco seis siete ocho nueve diez ".repeat(20);
    const chunks = TextChunker.chunk(text, { chunkSize: 100, overlap: 30 });

    expect(chunks.length).toBeGreaterThan(1);
    const endOfFirst = chunks[0]!.slice(-20);
    expect(chunks[1]).toContain(endOfFirst.trim().split(" ").slice(-2).join(" "));
  });

  it("normalizes internal whitespace before chunking", () => {
    const chunks = TextChunker.chunk("hola\n\n\n   mundo   \tcómo\nestás");
    expect(chunks).toEqual(["hola mundo cómo estás"]);
  });

  it("rejects an overlap that is not smaller than chunkSize", () => {
    expect(() => TextChunker.chunk("texto", { chunkSize: 100, overlap: 100 })).toThrow(/overlap/);
  });

  it("always makes progress and terminates for text much longer than chunkSize", () => {
    const text = "palabra ".repeat(5000); // ~40000 caracteres
    const chunks = TextChunker.chunk(text, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(50);
  });
});
