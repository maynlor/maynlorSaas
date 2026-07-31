// Se importa el entrypoint interno (`lib/pdf-parse.js`) y NO el paquete raíz
// a propósito: el `index.js` de pdf-parse v1 detecta "modo debug" mirando
// `module.parent`, algo que el interop ESM de Node deja `undefined` — y en
// ese caso ejecuta código de demo que intenta leer un PDF de prueba que no
// existe en este repo, tirando ENOENT en cada carga. `lib/pdf-parse.js` es
// la implementación real, sin ese wrapper.
// @types/pdf-parse tipa el paquete raíz, no este subpath; ver pdf-parse-lib.d.ts.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { IPdfTextExtractor } from "../../application/services/IPdfTextExtractor.js";

export class PdfParseTextExtractor implements IPdfTextExtractor {
  async extractText(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return result.text;
  }
}
