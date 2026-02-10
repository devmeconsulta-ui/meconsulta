-- Add unique index on whatsapp_message_id (excluding nulls) to support upsert dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_omni_mensagens_whatsapp_id_unique 
ON public.omni_mensagens (whatsapp_message_id) 
WHERE whatsapp_message_id IS NOT NULL;

-- Drop the old non-unique index since the new unique one covers the same queries
DROP INDEX IF EXISTS idx_omni_mensagens_whatsapp_id;