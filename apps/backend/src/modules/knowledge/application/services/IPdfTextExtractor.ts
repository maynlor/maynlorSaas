/** Abstrae la librería de extracción de PDF, igual patrón que AIProvider/PaymentProvider. */
export interface IPdfTextExtractor {
  /** Lanza si el buffer no es un PDF válido. */
  extractText(buffer: Buffer): Promise<string>;
}
