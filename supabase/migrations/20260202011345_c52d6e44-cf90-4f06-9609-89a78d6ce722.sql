-- Add reopening schedule fields to omni_atendimentos
ALTER TABLE public.omni_atendimentos 
ADD COLUMN IF NOT EXISTS data_reabertura TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mensagem_reabertura TEXT,
ADD COLUMN IF NOT EXISTS reabertura_agendada BOOLEAN DEFAULT false;

-- Add index for scheduled reopenings
CREATE INDEX IF NOT EXISTS idx_omni_atendimentos_reabertura 
ON public.omni_atendimentos (data_reabertura) 
WHERE reabertura_agendada = true AND status = 'finalizado';

-- Add comment for documentation
COMMENT ON COLUMN public.omni_atendimentos.data_reabertura IS 'Data e hora agendada para reabertura automática do atendimento';
COMMENT ON COLUMN public.omni_atendimentos.mensagem_reabertura IS 'Mensagem que será enviada automaticamente ao reabrir o atendimento';
COMMENT ON COLUMN public.omni_atendimentos.reabertura_agendada IS 'Indica se o atendimento possui reabertura agendada';