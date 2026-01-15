-- Criar tabela de metas financeiras da clínica
CREATE TABLE public.metas_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
  meta_faturamento NUMERIC DEFAULT 0,
  meta_consultas INTEGER DEFAULT 0,
  meta_novos_pacientes INTEGER DEFAULT 0,
  meta_ticket_medio NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Clinicas podem ver suas metas" 
ON public.metas_financeiras 
FOR SELECT 
USING (
  clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  ) OR 
  clinica_id IN (
    SELECT clinica_id FROM usuarios_clinica WHERE medico_id IN (
      SELECT id FROM medicos WHERE usuario_id = auth.uid()
    )
  )
);

CREATE POLICY "Clinicas podem criar suas metas" 
ON public.metas_financeiras 
FOR INSERT 
WITH CHECK (
  clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Clinicas podem atualizar suas metas" 
ON public.metas_financeiras 
FOR UPDATE 
USING (
  clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Clinicas podem deletar suas metas" 
ON public.metas_financeiras 
FOR DELETE 
USING (
  clinica_id IN (
    SELECT id FROM clinicas WHERE usuario_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_metas_financeiras_updated_at
BEFORE UPDATE ON public.metas_financeiras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_metas_financeiras_clinica_mes_ano ON public.metas_financeiras(clinica_id, ano, mes);