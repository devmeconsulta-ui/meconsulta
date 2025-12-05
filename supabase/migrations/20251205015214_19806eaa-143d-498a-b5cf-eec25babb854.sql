-- Tabela para histórico médico do paciente (alergias, condições, medicamentos)
CREATE TABLE public.historico_medico_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'alergia', 'condicao', 'medicamento'
  descricao TEXT NOT NULL,
  detalhes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_medico_paciente ENABLE ROW LEVEL SECURITY;

-- Policy: Pacientes podem ver e gerenciar seu próprio histórico
CREATE POLICY "Allow all for development" ON public.historico_medico_paciente
FOR ALL USING (true) WITH CHECK (true);

-- Tabela para anamneses (preenchida pelo médico)
CREATE TABLE public.anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE SET NULL,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  queixa_principal TEXT,
  historia_doenca_atual TEXT,
  antecedentes_pessoais TEXT,
  antecedentes_familiares TEXT,
  exame_fisico TEXT,
  hipotese_diagnostica TEXT,
  conduta TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all for development
CREATE POLICY "Allow all for development" ON public.anamneses
FOR ALL USING (true) WITH CHECK (true);

-- Adicionar campos na tabela consultas para informações do checkout
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS motivo_consulta TEXT,
ADD COLUMN IF NOT EXISTS sintomas TEXT,
ADD COLUMN IF NOT EXISTS tipo_servico TEXT,
ADD COLUMN IF NOT EXISTS observacoes_paciente TEXT;