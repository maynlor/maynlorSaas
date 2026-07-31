const MAX_CAUSE_DEPTH = 3;

/**
 * Describe un error incluyendo la cadena de causas.
 *
 * Traducir un error de infraestructura a uno de dominio pierde el motivo real
 * si no se arrastra la causa: en producción se veía "AI provider request
 * failed", que no distingue una cuota agotada de una clave inválida o de un
 * modelo inexistente — y diagnosticar eso obligaba a reproducir la llamada por
 * fuera de la aplicación.
 */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && current !== undefined && current !== null; depth += 1) {
    const message = current instanceof Error ? current.message : String(current);
    // Un envoltorio que repite el mensaje de su causa no aporta nada.
    if (!parts.includes(message)) {
      parts.push(message);
    }
    current = current instanceof Error ? current.cause : undefined;
  }

  return parts.join(" — caused by: ");
}
