export interface ChunkingOptions {
  /** Tamaño objetivo de cada fragmento, en caracteres. */
  chunkSize?: number;
  /** Caracteres que se repiten entre un fragmento y el siguiente. */
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 100;

/**
 * Parte un texto largo en fragmentos aptos para generar un embedding por
 * cada uno. División de tamaño fijo con solapamiento: simple y suficiente
 * para una primera versión — no es chunking consciente de oraciones ni de
 * tokens del modelo, así que puede cortar a mitad de una idea. El
 * solapamiento existe justamente para mitigar eso: la idea cortada al final
 * de un fragmento vuelve a aparecer completa al principio del siguiente.
 */
export class TextChunker {
  static chunk(text: string, options: ChunkingOptions = {}): string[] {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const overlap = options.overlap ?? DEFAULT_OVERLAP;
    if (overlap >= chunkSize) {
      throw new Error("overlap must be smaller than chunkSize");
    }

    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) return [];
    if (normalized.length <= chunkSize) return [normalized];

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      const hardEnd = Math.min(start + chunkSize, normalized.length);
      let end = hardEnd;

      // Preferir cortar en un espacio para no partir una palabra al medio.
      if (end < normalized.length) {
        const lastSpace = normalized.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace;
      }

      // Un tramo muy largo sin espacios (ej. una URL o un bloque sin cortes)
      // puede hacer que el corte por espacio caiga siempre en el mismo lugar
      // que la iteración anterior, sin avanzar: `nextStart` no superaría a
      // `start` y el bucle no terminaría nunca. Si pasa, se ignora la
      // preferencia por espacio y se corta duro para garantizar avance.
      if (end < normalized.length && end - overlap <= start) {
        end = hardEnd;
      }

      const piece = normalized.slice(start, end).trim();
      if (piece.length > 0) chunks.push(piece);

      if (end >= normalized.length) break;
      start = end - overlap;
    }

    return chunks;
  }
}
