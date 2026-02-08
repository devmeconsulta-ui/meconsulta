-- Adicionar campos de agendamento na tabela omni_ia_agentes
ALTER TABLE public.omni_ia_agentes 
ADD COLUMN IF NOT EXISTS permitir_agendamento boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS permitir_cancelamento boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pausar_quando_humano_responde boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tipos_atendimento text[] DEFAULT ARRAY['particular'],
ADD COLUMN IF NOT EXISTS exigir_cpf boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS antecedencia_minima_horas integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS antecedencia_maxima_dias integer DEFAULT 30;

-- Adicionar campo para rastrear se humano assumiu o atendimento
ALTER TABLE public.omni_ia_conversas
ADD COLUMN IF NOT EXISTS humano_assumiu boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS humano_assumiu_em timestamp with time zone;