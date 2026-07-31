// @types/pdf-parse solo tipa el paquete raíz ("pdf-parse"), no este subpath
// interno que usamos para esquivar el bug de module.parent del index.js
// (ver el comentario en PdfParseTextExtractor.ts).
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
