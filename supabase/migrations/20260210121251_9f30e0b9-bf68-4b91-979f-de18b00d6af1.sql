-- Drop the partial unique index (doesn't work with PostgREST upsert)
DROP INDEX IF EXISTS idx_omni_mensagens_whatsapp_id_unique;

-- Create a proper unique constraint on whatsapp_message_id
-- First handle any existing nulls - they're fine since UNIQUE allows multiple NULLs in PostgreSQL
ALTER TABLE public.omni_mensagens ADD CONSTRAINT omni_mensagens_whatsapp_message_id_key UNIQUE (whatsapp_message_id);