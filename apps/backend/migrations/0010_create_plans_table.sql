CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  description TEXT NULL,
  price_monthly NUMERIC(12, 2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  max_products INTEGER NULL,
  max_services INTEGER NULL,
  max_users INTEGER NULL,
  max_conversations_per_month INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (name, slug, description, price_monthly, currency, max_products, max_services, max_users, max_conversations_per_month)
VALUES
  ('Starter', 'starter', 'Para empezar a automatizar la atención al cliente.', 0, 'ARS', 20, 10, 1, 200),
  ('Pro', 'pro', 'Para empresas en crecimiento con más volumen de conversaciones.', 15000, 'ARS', 200, 100, 5, 2000),
  ('Business', 'business', 'Para operaciones con múltiples equipos y catálogos grandes.', 45000, 'ARS', 1000, 500, 20, 10000),
  ('Enterprise', 'enterprise', 'Límites a medida, integraciones dedicadas y soporte prioritario.', NULL, 'ARS', NULL, NULL, NULL, NULL);
