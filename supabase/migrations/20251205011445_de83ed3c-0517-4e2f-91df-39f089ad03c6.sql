-- Criar tabela de dependentes do paciente
CREATE TABLE public.paciente_dependentes (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  parentesco TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paciente_dependentes ENABLE ROW LEVEL SECURITY;

-- Policy for development
CREATE POLICY "Allow all for development" ON public.paciente_dependentes
  FOR ALL USING (true) WITH CHECK (true);

-- Adicionar campo para_quem na tabela consultas para saber se é para o paciente ou dependente
ALTER TABLE public.consultas 
ADD COLUMN dependente_id UUID REFERENCES public.paciente_dependentes(id),
ADD COLUMN nome_paciente_consulta TEXT;

-- Criar índices
CREATE INDEX idx_paciente_dependentes_paciente_id ON public.paciente_dependentes(paciente_id);
CREATE INDEX idx_consultas_dependente_id ON public.consultas(dependente_id);