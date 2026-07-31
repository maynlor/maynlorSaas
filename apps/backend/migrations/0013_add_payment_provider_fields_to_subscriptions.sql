ALTER TABLE subscriptions
  ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN external_id VARCHAR(120) NULL;

CREATE UNIQUE INDEX idx_subscriptions_provider_external_id
  ON subscriptions (provider, external_id)
  WHERE external_id IS NOT NULL;

-- Los checkouts pendientes de autorización también cuentan como "vigentes"
-- para evitar que un negocio dispare varios checkouts en simultáneo.
DROP INDEX idx_subscriptions_business_current;
CREATE UNIQUE INDEX idx_subscriptions_business_current
  ON subscriptions (business_id)
  WHERE status IN ('pending', 'trialing', 'active', 'past_due');
