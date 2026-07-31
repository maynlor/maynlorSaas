-- Ventana durante la cual un negocio con el cobro fallido (`past_due`) conserva
-- los límites de su plan. Sin esto, un rechazo transitorio de la tarjeta lo
-- degradaría al plan gratis de inmediato.
ALTER TABLE subscriptions
  ADD COLUMN grace_ends_at TIMESTAMPTZ NULL;
