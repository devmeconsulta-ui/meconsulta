-- Create table for internal notes (clinic admin to agent notifications)
CREATE TABLE public.omni_notas_internas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.omni_atendimentos(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  criado_por_usuario_id UUID,
  criado_por_nome VARCHAR(255) NOT NULL,
  destinatario_agente_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.omni_notas_internas ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_omni_notas_internas_atendimento ON public.omni_notas_internas(atendimento_id);
CREATE INDEX idx_omni_notas_internas_clinica ON public.omni_notas_internas(clinica_id);
CREATE INDEX idx_omni_notas_internas_agente ON public.omni_notas_internas(destinatario_agente_id);

-- Simple permissive policy for all operations (matching other omni tables pattern)
CREATE POLICY "Allow all for omni_notas_internas"
ON public.omni_notas_internas
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.omni_notas_internas;