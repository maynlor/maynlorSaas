const MAX_DETAIL_LENGTH = 300;

interface ApiErrorBody {
  error?: { message?: string };
}

/**
 * Construye el error de una respuesta HTTP fallida incluyendo lo que dijo el
 * proveedor, no solo el código.
 *
 * El código solo es engañoso: un 429 de Gemini puede ser "agotaste la cuota
 * del minuto, reintentá en 28s" (transitorio) o "este modelo tiene limit: 0 en
 * tu plan" (nunca va a funcionar). Sin el cuerpo del mensaje, diagnosticar eso
 * exige reproducir la llamada a mano por fuera de la aplicación.
 */
export async function aiHttpError(response: Response, prefix: string): Promise<Error> {
  let detail = "";
  try {
    const raw = await response.text();
    if (raw) {
      let message: string | undefined;
      try {
        message = (JSON.parse(raw) as ApiErrorBody).error?.message;
      } catch {
        // Cuerpo no-JSON (ej. un HTML de error de un proxy): se usa crudo.
      }
      detail = `: ${(message ?? raw).slice(0, MAX_DETAIL_LENGTH)}`;
    }
  } catch {
    // Un cuerpo ilegible no debe tapar el error original.
  }

  return new Error(`${prefix} failed with status ${response.status}${detail}`);
}
