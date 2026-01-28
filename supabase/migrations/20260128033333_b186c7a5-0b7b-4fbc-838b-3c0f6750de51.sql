-- Tabela para armazenar confirmações de agenda enviadas via WhatsApp
CREATE TABLE public.confirmacoes_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  fila_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  mensagem_enviada TEXT,
  link_confirmacao TEXT,
  token_confirmacao TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'confirmada', 'recusada', 'erro', 'expirada')),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_resposta TIMESTAMP WITH TIME ZONE,
  whatsapp_message_id TEXT,
  erro_descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_confirmacoes_agenda_clinica_id ON public.confirmacoes_agenda(clinica_id);
CREATE INDEX idx_confirmacoes_agenda_consulta_id ON public.confirmacoes_agenda(consulta_id);
CREATE INDEX idx_confirmacoes_agenda_token ON public.confirmacoes_agenda(token_confirmacao);
CREATE INDEX idx_confirmacoes_agenda_status ON public.confirmacoes_agenda(status);
CREATE INDEX idx_confirmacoes_agenda_data_envio ON public.confirmacoes_agenda(data_envio);

-- Habilitar RLS
ALTER TABLE public.confirmacoes_agenda ENABLE ROW LEVEL SECURITY;

-- Política aberta para desenvolvimento (seguindo padrão existente do projeto)
CREATE POLICY "Allow all for confirmacoes_agenda" 
ON public.confirmacoes_agenda 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.confirmacoes_agenda IS 'Armazena confirmações de agenda enviadas via WhatsApp';
COMMENT ON COLUMN public.confirmacoes_agenda.token_confirmacao IS 'Token único para validar resposta do paciente';
COMMENT ON COLUMN public.confirmacoes_agenda.status IS 'Status: pendente, enviada, confirmada, recusada, erro, expirada';