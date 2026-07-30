CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  channel VARCHAR(20) NOT NULL DEFAULT 'api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_business_id ON conversations (business_id);
CREATE INDEX idx_conversations_client_id ON conversations (client_id);
