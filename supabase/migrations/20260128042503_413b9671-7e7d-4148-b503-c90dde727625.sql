-- Adicionar campo para agendamento de envio de confirmações
ALTER TABLE public.confirmacoes_agenda
ADD COLUMN IF NOT EXISTS data_agendamento TIMESTAMP WITH TIME ZONE NULL;

-- Criar índice para consultas agendadas
CREATE INDEX IF NOT EXISTS idx_confirmacoes_data_agendamento 
ON public.confirmacoes_agenda (data_agendamento) 
WHERE data_agendamento IS NOT NULL AND status = 'agendada';

-- Comentário para documentação
COMMENT ON COLUMN public.confirmacoes_agenda.data_agendamento IS 'Data/hora programada para envio automático da mensagem';