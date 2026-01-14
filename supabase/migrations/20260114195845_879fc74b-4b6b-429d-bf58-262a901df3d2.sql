-- Add archived flag to chat_participantes (per-user archiving)
ALTER TABLE public.chat_participantes 
ADD COLUMN arquivada boolean DEFAULT false;

-- Add index for filtering archived conversations
CREATE INDEX idx_chat_participantes_arquivada ON public.chat_participantes(arquivada);