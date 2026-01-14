-- Add pinned flag to chat_participantes (per-user pinning)
ALTER TABLE public.chat_participantes
ADD COLUMN fixada boolean DEFAULT false;

-- Add index for sorting pinned conversations
CREATE INDEX idx_chat_participantes_fixada ON public.chat_participantes(fixada);