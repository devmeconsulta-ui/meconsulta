-- Tabela de notificações para pacientes
CREATE TABLE public.paciente_notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info', -- info, success, warning, error
  categoria text NOT NULL DEFAULT 'geral', -- meconsulta_pay, consulta, sistema
  referencia_id uuid, -- ID da solicitação/consulta relacionada
  lida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.paciente_notificacoes ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all for paciente_notificacoes" 
ON public.paciente_notificacoes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_paciente_notificacoes_paciente_id ON public.paciente_notificacoes(paciente_id);
CREATE INDEX idx_paciente_notificacoes_lida ON public.paciente_notificacoes(paciente_id, lida);

-- Adicionar campos para detalhes do crédito aprovado na tabela de solicitações
ALTER TABLE public.meconsulta_pay_solicitacoes 
ADD COLUMN IF NOT EXISTS valor_aprovado numeric,
ADD COLUMN IF NOT EXISTS taxa_juros_mensal numeric DEFAULT 1.99,
ADD COLUMN IF NOT EXISTS quantidade_parcelas integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS data_aprovacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS observacoes_analise text;