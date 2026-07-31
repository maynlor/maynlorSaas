import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler, type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Redis } from "ioredis";
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
 * Sin un store compartido, cada instancia del proceso lleva su propia cuenta
 * y el límite real termina siendo `N × max` con N instancias. Con un cliente
 * de Redis, todas comparten el mismo contador. Si no hay Redis configurado
 * (dev, tests, una sola instancia) se cae al `MemoryStore` por defecto de
 * express-rate-limit — mismo comportamiento que antes de esta función.
 */
type RedisReply = boolean | number | string | (boolean | number | string)[];

/**
 * express-rate-limit prohíbe reutilizar la misma instancia de `Store` entre
 * varios limitadores (tiene estado propio de conteo por store). Como los tres
 * limitadores (api/auth/webhook) comparten el mismo Redis, cada uno necesita
 * su propia instancia de `RedisStore` con un `prefix` distinto para no pisar
 * las claves de los otros.
 */
export function createRateLimitStore(redisClient: Redis | undefined, prefix: string): Store | undefined {
  if (!redisClient) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: async (command: string, ...args: string[]): Promise<RedisReply> => {
      const result = (await redisClient.call(command, ...args)) as RedisReply;
      return result;
    },
  });
}

/**
 * En una API multiempresa la clave natural es el negocio autenticado: si se
 * limitara solo por IP, todos los usuarios detrás de una misma oficina o
 * proxy compartirían el cupo. Se cae a la IP para el tráfico anónimo.
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

function build(
  config: RateLimitConfig,
  keyGenerator: (req: Request) => string,
  store: Store | undefined,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    message: RATE_LIMIT_ERROR,
    // `exactOptionalPropertyTypes` distingue "sin store" de "store: undefined"
    // — el spread condicional omite la clave por completo en el segundo caso.
    ...(store ? { store } : {}),
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
export function createApiRateLimiter(config: RateLimitConfig, store?: Store): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByBusinessOrIp,
    message: RATE_LIMIT_ERROR,
    skip: (req) => RATE_LIMIT_EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix)),
    ...(store ? { store } : {}),
  });
}

/**
 * Límite estricto para login/registro: son endpoints anónimos y el objetivo es
 * encarecer la fuerza bruta sobre contraseñas, así que siempre se limita por IP.
 */
export function createAuthRateLimiter(config: RateLimitConfig, store?: Store): RateLimitRequestHandler {
  return build(config, (req) => `auth:${ipKey(req)}`, store);
}

/**
 * Límite holgado para webhooks entrantes: los proveedores reintentan las
 * notificaciones y descartarlas con un 429 haría perder confirmaciones de pago.
 * Existe solo como cortafuegos ante un flood.
 */
export function createWebhookRateLimiter(config: RateLimitConfig, store?: Store): RateLimitRequestHandler {
  return build(config, (req) => `webhook:${ipKey(req)}`, store);
}
