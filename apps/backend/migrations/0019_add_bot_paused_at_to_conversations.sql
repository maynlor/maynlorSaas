-- Traspaso de la conversación del bot a una persona.
--
-- Cuando alguien del negocio responde manualmente desde el panel, el bot deja
-- de contestar en esa conversación hasta que lo reactiven. Sin esto el cliente
-- recibiría dos respuestas distintas para el mismo mensaje —la de la persona y
-- la de la IA— que es la peor experiencia posible en atención al cliente.
--
-- Se guarda el instante y no un booleano: sirve para mostrar desde cuándo está
-- intervenida y habilita a futuro una reactivación automática por inactividad
-- sin migrar de nuevo.
ALTER TABLE conversations ADD COLUMN bot_paused_at TIMESTAMPTZ;

COMMENT ON COLUMN conversations.bot_paused_at IS
  'Cuándo una persona tomó la conversación. NULL = el bot responde.';
