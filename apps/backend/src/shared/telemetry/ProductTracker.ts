/**
 * Telemetría de producto: eventos que ustedes (el equipo de SaasBot) usan
 * para entender cómo las empresas usan la plataforma. Distinto del módulo
 * `analytics`, que expone métricas de cada negocio sobre sí mismo.
 */
export interface ProductTracker {
  track(distinctId: string, event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string, properties?: Record<string, unknown>): void;
}
