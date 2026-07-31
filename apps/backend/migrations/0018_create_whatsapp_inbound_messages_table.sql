-- Deduplicación de mensajes entrantes de WhatsApp.
--
-- Meta reintenta la entrega de un webhook si no recibe el 200 a tiempo, y el
-- mismo `wamid` puede llegar varias veces. Sin esta tabla, cada reintento
-- generaba otra respuesta al cliente, otro par de mensajes en la conversación,
-- otra llamada (paga) al LLM y otro consumo del cupo mensual del plan.
--
-- El `external_id` es el `wamid` de Meta, único a nivel global (no por
-- negocio), así que la unicidad no lleva `business_id`. Se guarda el
-- `phone_number_id` solo para trazabilidad: a quién pertenecía el mensaje se
-- resuelve recién dentro del caso de uso.
CREATE TABLE whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  phone_number_id TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  attempts INTEGER NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Para el barrido de reclamos vencidos (procesos que murieron a mitad).
CREATE INDEX idx_whatsapp_inbound_messages_status_claimed_at
  ON whatsapp_inbound_messages (status, claimed_at);
