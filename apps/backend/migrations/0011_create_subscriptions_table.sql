CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_business_id ON subscriptions (business_id);

-- Un negocio solo puede tener una suscripción vigente (no cancelada) a la vez.
CREATE UNIQUE INDEX idx_subscriptions_business_current
  ON subscriptions (business_id)
  WHERE status IN ('trialing', 'active', 'past_due');
