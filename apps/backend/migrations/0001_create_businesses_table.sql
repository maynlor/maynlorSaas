CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_businesses_email_active ON businesses (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_businesses_slug_active ON businesses (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_businesses_created_at ON businesses (created_at);
