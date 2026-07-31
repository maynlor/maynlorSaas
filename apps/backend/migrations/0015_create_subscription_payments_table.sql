-- Historial de cobros de cada suscripción: sirve de auditoría, alimenta la
-- facturación que ve el negocio en el panel, y permite detectar cobros
-- rechazados sin depender solo del estado agregado de la suscripción.
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  provider VARCHAR(20) NOT NULL,
  -- Id del cobro en el proveedor. Único por proveedor: los webhooks se
  -- reintentan y sin esto un mismo cobro quedaría registrado varias veces.
  external_id VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscription_payments_provider_external_id
  ON subscription_payments (provider, external_id);

CREATE INDEX idx_subscription_payments_business_id
  ON subscription_payments (business_id, processed_at DESC);

CREATE INDEX idx_subscription_payments_subscription_id
  ON subscription_payments (subscription_id);
