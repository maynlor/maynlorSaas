CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  stock INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_products_business_id ON products (business_id);
CREATE INDEX idx_products_business_active ON products (business_id, is_active)
  WHERE deleted_at IS NULL;
