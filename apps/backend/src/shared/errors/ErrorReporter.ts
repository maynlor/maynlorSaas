/**
 * Reporta fallos a un servicio externo de seguimiento de errores.
 *
 * Es un puerto por la misma razón que `AIProvider` o `PaymentProvider`: el
 * resto del sistema no debe saber si detrás hay Sentry, otro proveedor, o nada.
 */
export interface ErrorReporter {
  /**
   * `context` es la misma metadata que se le pasa al logger. La implementación
   * es responsable de no filtrar secretos ni datos personales.
   */
  captureError(message: string, context?: object): void;
}
