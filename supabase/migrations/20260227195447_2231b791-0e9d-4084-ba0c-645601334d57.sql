
-- Add dedup_hash column for fallback deduplication
ALTER TABLE public.omni_mensagens
  ADD COLUMN IF NOT EXISTS dedup_hash text;

-- Create unique index on dedup_hash (partial: only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_omni_mensagens_dedup_hash
  ON public.omni_mensagens (dedup_hash)
  WHERE dedup_hash IS NOT NULL;

-- Create a function to auto-generate dedup_hash when whatsapp_message_id is null
CREATE OR REPLACE FUNCTION public.omni_mensagens_dedup_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only generate hash if whatsapp_message_id is null or empty
  IF NEW.whatsapp_message_id IS NULL OR NEW.whatsapp_message_id = '' THEN
    NEW.dedup_hash := encode(
      extensions.digest(
        COALESCE(NEW.atendimento_id::text, '') || '|' ||
        COALESCE(NEW.contato_id::text, '') || '|' ||
        COALESCE(to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS'), '') || '|' ||
        NEW.direcao || '|' ||
        COALESCE(LEFT(NEW.conteudo, 200), '') || '|' ||
        COALESCE(NEW.arquivo_url, ''),
        'sha256'
      ),
      'hex'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_omni_mensagens_dedup ON public.omni_mensagens;
CREATE TRIGGER trg_omni_mensagens_dedup
  BEFORE INSERT ON public.omni_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.omni_mensagens_dedup_hash();
