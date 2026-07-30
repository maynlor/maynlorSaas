CREATE TABLE client_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_memories_business_client ON client_memories (business_id, client_id);
