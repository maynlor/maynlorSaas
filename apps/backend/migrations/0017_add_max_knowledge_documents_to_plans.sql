-- Límite de documentos de conocimiento (RAG) por plan, igual patrón que los
-- límites existentes de productos/servicios: NULL = ilimitado.
ALTER TABLE plans
  ADD COLUMN max_knowledge_documents INTEGER NULL;

UPDATE plans SET max_knowledge_documents = 5 WHERE slug = 'starter';
UPDATE plans SET max_knowledge_documents = 50 WHERE slug = 'pro';
UPDATE plans SET max_knowledge_documents = 200 WHERE slug = 'business';
-- enterprise queda NULL (ilimitado), como sus otros límites.
