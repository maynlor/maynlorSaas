/**
 * Claves cuyo valor no puede salir del sistema bajo ninguna circunstancia.
 * Se compara en minúsculas y por inclusión, así cubre `accessToken`,
 * `WHATSAPP_ACCESS_TOKEN`, `jwt_secret`, `authorization`, etc.
 */
const SECRET_KEY_FRAGMENTS = [
  "token",
  "secret",
  "password",
  "authorization",
  "apikey",
  "api_key",
  "credential",
  "cookie",
  "signature",
];

/** Un número pelado de 8 a 15 dígitos: la forma de un teléfono. */
const PHONE_LIKE = /^\+?\d{8,15}$/;

const MAX_DEPTH = 4;
const REDACTED = "[redacted]";

/**
 * Enmascara un teléfono dejando lo justo para correlacionar eventos sin
 * mandarle el número completo de un cliente a un tercero.
 *
 * Se conserva el prefijo (país y área, que es lo que sirve para reconocer un
 * problema de formato como el del 9 argentino) y los dos últimos dígitos.
 */
function maskPhone(value: string): string {
  const visibleStart = value.startsWith("+") ? 5 : 4;
  if (value.length <= visibleStart + 2) return REDACTED;
  return `${value.slice(0, visibleStart)}***${value.slice(-2)}`;
}

/**
 * Limpia la metadata de un log antes de mandarla a un servicio externo.
 *
 * Dos motivos distintos, no uno:
 * - **Secretos**: un token o una firma en un reporte de error es una fuga de
 *   credenciales hacia un tercero, y encima queda archivada.
 * - **Datos personales**: los teléfonos de los clientes son de las empresas que
 *   usan la plataforma, no nuestros. Mandarlos enteros a otro proveedor es una
 *   decisión que no nos corresponde tomar por ellas.
 */
export function redactContext(context: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[too deep]";

  if (typeof context === "string") {
    return PHONE_LIKE.test(context) ? maskPhone(context) : context;
  }

  if (Array.isArray(context)) {
    return context.map((item) => redactContext(item, depth + 1));
  }

  if (context === null || typeof context !== "object") {
    return context;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SECRET_KEY_FRAGMENTS.some((fragment) => lowerKey.includes(fragment))) {
      result[key] = REDACTED;
      continue;
    }
    result[key] = redactContext(value, depth + 1);
  }
  return result;
}
