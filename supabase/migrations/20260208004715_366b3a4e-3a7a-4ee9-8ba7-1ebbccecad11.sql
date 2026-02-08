-- Add scheduling permission to AI agents
ALTER TABLE public.omni_ia_agentes 
ADD COLUMN IF NOT EXISTS permitir_agendamento boolean DEFAULT false;

-- Create scheduling configuration table
CREATE TABLE IF NOT EXISTS public.omni_ia_agendamentos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid NOT NULL REFERENCES public.omni_ia_agentes(id) ON DELETE CASCADE,
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipos_atendimento text[] DEFAULT ARRAY['particular']::text[],
  valor_padrao numeric DEFAULT 0,
  distribuicao_atendentes text DEFAULT 'round_robin',
  exigir_cpf boolean DEFAULT false,
  permitir_encaixe boolean DEFAULT false,
  antecedencia_minima_horas integer DEFAULT 2,
  antecedencia_maxima_dias integer DEFAULT 60,
  mensagem_confirmacao text DEFAULT 'Sua consulta foi agendada com sucesso!',
  mensagem_lembrete text DEFAULT 'Lembrete: você tem uma consulta amanhã.',
  especialidades_permitidas text[] DEFAULT ARRAY[]::text[],
  horario_inicio time DEFAULT '08:00',
  horario_fim time DEFAULT '18:00',
  dias_semana integer[] DEFAULT ARRAY[1,2,3,4,5]::integer[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agente_id)
);

-- Enable RLS
ALTER TABLE public.omni_ia_agendamentos_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clinica can view own scheduling config"
  ON public.omni_ia_agendamentos_config
  FOR SELECT
  USING (clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ));

CREATE POLICY "Clinica can insert own scheduling config"
  ON public.omni_ia_agendamentos_config
  FOR INSERT
  WITH CHECK (clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ));

CREATE POLICY "Clinica can update own scheduling config"
  ON public.omni_ia_agendamentos_config
  FOR UPDATE
  USING (clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ));

CREATE POLICY "Clinica can delete own scheduling config"
  ON public.omni_ia_agendamentos_config
  FOR DELETE
  USING (clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_omni_ia_agendamentos_config_updated_at
  BEFORE UPDATE ON public.omni_ia_agendamentos_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to track AI scheduling actions for round-robin distribution
CREATE TABLE IF NOT EXISTS public.omni_ia_agendamentos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  agente_id uuid REFERENCES public.omni_ia_agentes(id) ON DELETE SET NULL,
  atendimento_id uuid REFERENCES public.omni_atendimentos(id) ON DELETE SET NULL,
  consulta_id uuid REFERENCES public.consultas(id) ON DELETE SET NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  usuario_clinica_id uuid REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  acao text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb,
  sucesso boolean DEFAULT true,
  erro text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.omni_ia_agendamentos_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for log
CREATE POLICY "Clinica can view own scheduling logs"
  ON public.omni_ia_agendamentos_log
  FOR SELECT
  USING (clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ));

CREATE POLICY "Service role can insert scheduling logs"
  ON public.omni_ia_agendamentos_log
  FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_omni_ia_agendamentos_log_clinica ON public.omni_ia_agendamentos_log(clinica_id);
CREATE INDEX IF NOT EXISTS idx_omni_ia_agendamentos_log_created ON public.omni_ia_agendamentos_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_omni_ia_agendamentos_config_agente ON public.omni_ia_agendamentos_config(agente_id);