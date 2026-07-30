ALTER TABLE businesses ADD COLUMN whatsapp_phone_number_id VARCHAR(64) NULL;

CREATE UNIQUE INDEX idx_businesses_whatsapp_phone_number_id ON businesses (whatsapp_phone_number_id)
  WHERE whatsapp_phone_number_id IS NOT NULL;
