
-- Add media metadata columns to omni_mensagens
ALTER TABLE public.omni_mensagens
  ADD COLUMN IF NOT EXISTS media_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_mime text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_size integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_original_url text DEFAULT NULL;

-- Index for lazy media download worker
CREATE INDEX IF NOT EXISTS idx_omni_mensagens_media_pending
  ON public.omni_mensagens (media_status)
  WHERE media_status = 'pending';
