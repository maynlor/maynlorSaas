import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";

export interface RateLimitConfig {
  /** Ventana en milisegundos. */
  windowMs: number;
  /** Peticiones permitidas por ventana y por clave. */
  max: number;
}

const RATE_LIMIT_ERROR = {
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please slow down and try again later.",
  },
};

/**
 * En una API multiempresa la clave natural es el negocio autenticado: si se
 * limitara solo por IP, todos los usuarios detrás de una misma oficina o
 * proxy compartirían el cupo. Se cae a la IP para el tráfico anónimo.
 *
 * Nota de escalabilidad: el store por defecto vive en memoria del proceso, así
 * que con varias instancias cada una lleva su propia cuenta. Para el objetivo
 * de 1000+ empresas hay que pasar a un store de Redis (`store:` de
 * express-rate-limit); la firma de estos helpers no cambia al hacerlo.
 */
/**
 * `ipKeyGenerator` agrupa las IPv6 por subred: un mismo cliente suele disponer
 * de un /64 entero, así que usar la dirección cruda permitiría rotarlas y
 * evadir el límite.
 */
function ipKey(req: Request): string {
  return ipKeyGenerator(req.ip ?? "unknown");
}

function keyByBusinessOrIp(req: Request): string {
  const businessId = req.auth?.businessId;
  return businessId ? `business:${businessId}` : `ip:${ipKey(req)}`;
}

function build(config: RateLimitConfig, keyGenerator: (req: Request) => string): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    message: RATE_LIMIT_ERROR,
  });
}

/**
 * Rutas que no deben consumir el cupo general:
 * - `/webhooks`: llegan desde unas pocas IPs del proveedor y en ráfagas, así
 *   que compartirían cupo entre todas las empresas y terminaríamos rechazando
 *   confirmaciones de pago. Tienen su propio limitador.
 * - `/health`: lo consulta la plataforma de hosting cada pocos segundos; si se
 *   quedara sin cupo, daría la instancia por caída y la sacaría de rotación.
 */
const RATE_LIMIT_EXEMPT_PREFIXES = ["/webhooks", "/health"];

/** Límite general de la API. */
export function createApiRateLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByBusinessOrIp,
    message: RATE_LIMIT_ERROR,
    skip: (req) => RATE_LIMIT_EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix)),
  });
}

/**
 * Límite estricto para login/registro: son endpoints anónimos y el objetivo es
 * encarecer la fuerza bruta sobre contraseñas, así que siempre se limita por IP.
 */
export function createAuthRateLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  return build(config, (req) => `auth:${ipKey(req)}`);
}

/**
 * Límite holgado para webhooks entrantes: los proveedores reintentan las
 * notificaciones y descartarlas con un 429 haría perder confirmaciones de pago.
 * Existe solo como cortafuegos ante un flood.
 */
export function createWebhookRateLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  return build(config, (req) => `webhook:${ipKey(req)}`);
}
