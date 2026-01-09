-- Create convenios table
CREATE TABLE public.convenios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Clinicas podem ver seus convenios"
  ON public.convenios FOR SELECT
  USING (true);

CREATE POLICY "Clinicas podem criar convenios"
  ON public.convenios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Clinicas podem atualizar seus convenios"
  ON public.convenios FOR UPDATE
  USING (true);

CREATE POLICY "Clinicas podem deletar seus convenios"
  ON public.convenios FOR DELETE
  USING (true);

-- Add index
CREATE INDEX idx_convenios_clinica_id ON public.convenios(clinica_id);