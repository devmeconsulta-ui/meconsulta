-- Criar tabela para prescrições e documentos médicos
CREATE TABLE public.prescricoes_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id),
  medico_id UUID NOT NULL REFERENCES public.medicos(id),
  tipo VARCHAR(50) NOT NULL, -- 'exame', 'atestado', 'receita'
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  dados_adicionais JSONB DEFAULT '{}',
  memed_id VARCHAR(255), -- Para integração futura com Memed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prescricoes_documentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Médicos podem ver documentos que criaram"
ON public.prescricoes_documentos
FOR SELECT
USING (
  medico_id IN (SELECT id FROM public.medicos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Médicos podem criar documentos"
ON public.prescricoes_documentos
FOR INSERT
WITH CHECK (
  medico_id IN (SELECT id FROM public.medicos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Médicos podem atualizar documentos que criaram"
ON public.prescricoes_documentos
FOR UPDATE
USING (
  medico_id IN (SELECT id FROM public.medicos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Médicos podem deletar documentos que criaram"
ON public.prescricoes_documentos
FOR DELETE
USING (
  medico_id IN (SELECT id FROM public.medicos WHERE usuario_id = auth.uid())
);

CREATE POLICY "Pacientes podem ver seus próprios documentos"
ON public.prescricoes_documentos
FOR SELECT
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
);

-- Índices
CREATE INDEX idx_prescricoes_consulta ON public.prescricoes_documentos(consulta_id);
CREATE INDEX idx_prescricoes_paciente ON public.prescricoes_documentos(paciente_id);
CREATE INDEX idx_prescricoes_medico ON public.prescricoes_documentos(medico_id);
CREATE INDEX idx_prescricoes_tipo ON public.prescricoes_documentos(tipo);

-- Trigger para updated_at
CREATE TRIGGER update_prescricoes_updated_at
BEFORE UPDATE ON public.prescricoes_documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();