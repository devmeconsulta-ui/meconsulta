
-- Add status_faturamento column to consultas
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS status_faturamento text NOT NULL DEFAULT 'nao_faturado';

-- Create tiss_guias table
CREATE TABLE public.tiss_guias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  consulta_id UUID NOT NULL REFERENCES public.consultas(id),
  paciente_id UUID REFERENCES public.pacientes(id),
  medico_id UUID REFERENCES public.medicos(id),
  operadora TEXT NOT NULL,
  plano TEXT,
  carteirinha TEXT,
  crm TEXT,
  crm_uf TEXT,
  tipo_guia TEXT NOT NULL DEFAULT 'consulta',
  numero_guia TEXT,
  status TEXT NOT NULL DEFAULT 'pronta',
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tiss_guia_itens table for procedure items
CREATE TABLE public.tiss_guia_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guia_id UUID NOT NULL REFERENCES public.tiss_guias(id) ON DELETE CASCADE,
  codigo_tuss TEXT NOT NULL,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  especie TEXT DEFAULT '1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tiss_guias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiss_guia_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for tiss_guias
CREATE POLICY "Clinica can view own guias" ON public.tiss_guias
  FOR SELECT USING (true);

CREATE POLICY "Clinica can insert guias" ON public.tiss_guias
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinica can update own guias" ON public.tiss_guias
  FOR UPDATE USING (true);

-- RLS policies for tiss_guia_itens
CREATE POLICY "Anyone can view guia itens" ON public.tiss_guia_itens
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert guia itens" ON public.tiss_guia_itens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update guia itens" ON public.tiss_guia_itens
  FOR UPDATE USING (true);

-- Indexes
CREATE INDEX idx_tiss_guias_clinica ON public.tiss_guias(clinica_id);
CREATE INDEX idx_tiss_guias_consulta ON public.tiss_guias(consulta_id);
CREATE INDEX idx_tiss_guias_status ON public.tiss_guias(status);
CREATE INDEX idx_tiss_guia_itens_guia ON public.tiss_guia_itens(guia_id);
CREATE INDEX idx_consultas_status_faturamento ON public.consultas(status_faturamento);

-- Auto-generate numero_guia
CREATE OR REPLACE FUNCTION public.generate_guia_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_guia := 'G-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('tiss_guia_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE SEQUENCE IF NOT EXISTS tiss_guia_seq START 1;

CREATE TRIGGER set_guia_number
  BEFORE INSERT ON public.tiss_guias
  FOR EACH ROW
  WHEN (NEW.numero_guia IS NULL)
  EXECUTE FUNCTION public.generate_guia_number();
