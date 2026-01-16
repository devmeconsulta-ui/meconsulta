-- Create clinica_notificacoes table for clinic notifications
CREATE TABLE public.clinica_notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  categoria TEXT NOT NULL DEFAULT 'geral',
  referencia_id UUID NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinica_notificacoes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Clinicas podem ver suas próprias notificações"
ON public.clinica_notificacoes
FOR SELECT
USING (true);

CREATE POLICY "Sistema pode inserir notificações"
ON public.clinica_notificacoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Clinicas podem atualizar suas notificações"
ON public.clinica_notificacoes
FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_clinica_notificacoes_clinica_id ON public.clinica_notificacoes(clinica_id);
CREATE INDEX idx_clinica_notificacoes_lida ON public.clinica_notificacoes(clinica_id, lida);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinica_notificacoes;