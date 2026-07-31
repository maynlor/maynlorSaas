const MAX_DETAIL_LENGTH = 300;

interface ApiErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_data?: { details?: string };
  };
}

/**
 * Construye el error de una respuesta HTTP fallida incluyendo lo que dijo el
 * proveedor, no solo el código.
 *
 * El código solo es engañoso: un 429 de Gemini puede ser "agotaste la cuota del
 * minuto, reintentá en 28s" (transitorio) o "este modelo tiene limit: 0 en tu
 * plan" (nunca va a funcionar). Un 400 de Meta puede ser el número fuera de la
 * lista de destinatarios permitidos, el token vencido o un botón inválido —
 * todas causas distintas con la misma pinta. Sin el cuerpo del mensaje,
 * diagnosticar eso exige reproducir la llamada a mano por fuera de la
 * aplicación.
 *
 * Vive en `shared` porque tanto los proveedores de IA como el cliente de
 * WhatsApp devuelven la misma forma de error (`{ error: { message } }`), y
 * hacer que el módulo `whatsapp` importe de `ai` los acoplaría sin motivo.
 */
export async function apiHttpError(response: Response, prefix: string): Promise<Error> {
  let detail = "";
  try {
    const raw = await response.text();
    if (raw) {
      let message: string | undefined;
      try {
        const body = (JSON.parse(raw) as ApiErrorBody).error;
        if (body?.message) {
          // El `code` de Meta es lo que se busca en su documentación (ej. 131030
          // = destinatario no permitido), y `details` suele ser más específico
          // que el mensaje genérico.
          const code = body.code !== undefined ? ` (code ${body.code})` : "";
          const details = body.error_data?.details ? ` — ${body.error_data.details}` : "";
          message = `${body.message}${code}${details}`;
        }
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
