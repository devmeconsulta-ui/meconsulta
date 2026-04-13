
-- Create table for multiple cash registers per clinic
CREATE TABLE public.caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Caixa Principal',
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for caixas" ON public.caixas FOR ALL USING (true) WITH CHECK (true);

-- Add caixa_id to existing tables
ALTER TABLE public.caixa_operacoes ADD COLUMN caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL;
ALTER TABLE public.caixa_movimentos ADD COLUMN caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL;

-- Create a default "Caixa Principal" for every existing clinic
INSERT INTO public.caixas (clinica_id, nome, descricao, cor)
SELECT id, 'Caixa Principal', 'Caixa padrão da clínica', '#3b82f6'
FROM public.clinicas;

-- Link existing operations to the default caixa
UPDATE public.caixa_operacoes co
SET caixa_id = c.id
FROM public.caixas c
WHERE co.clinica_id = c.clinica_id AND co.caixa_id IS NULL;

UPDATE public.caixa_movimentos cm
SET caixa_id = c.id
FROM public.caixas c
WHERE cm.clinica_id = c.clinica_id AND cm.caixa_id IS NULL;
