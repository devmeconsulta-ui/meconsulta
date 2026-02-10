
-- Create tiss_lotes table
CREATE TABLE public.tiss_lotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  numero_lote TEXT,
  operadora TEXT NOT NULL,
  competencia TEXT NOT NULL, -- formato YYYY-MM
  status TEXT NOT NULL DEFAULT 'aberto',
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  qtd_guias INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tiss_lote_itens (link between lote and guia)
CREATE TABLE public.tiss_lote_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.tiss_lotes(id) ON DELETE CASCADE,
  guia_id UUID NOT NULL REFERENCES public.tiss_guias(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tiss_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiss_lote_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Select tiss_lotes" ON public.tiss_lotes FOR SELECT USING (true);
CREATE POLICY "Insert tiss_lotes" ON public.tiss_lotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Update tiss_lotes" ON public.tiss_lotes FOR UPDATE USING (true);

CREATE POLICY "Select tiss_lote_itens" ON public.tiss_lote_itens FOR SELECT USING (true);
CREATE POLICY "Insert tiss_lote_itens" ON public.tiss_lote_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Delete tiss_lote_itens" ON public.tiss_lote_itens FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_tiss_lotes_clinica ON public.tiss_lotes(clinica_id);
CREATE INDEX idx_tiss_lotes_status ON public.tiss_lotes(status);
CREATE INDEX idx_tiss_lote_itens_lote ON public.tiss_lote_itens(lote_id);
CREATE INDEX idx_tiss_lote_itens_guia ON public.tiss_lote_itens(guia_id);

-- Auto-generate numero_lote
CREATE SEQUENCE IF NOT EXISTS tiss_lote_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_lote_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_lote := 'L-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('tiss_lote_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_lote_number
  BEFORE INSERT ON public.tiss_lotes
  FOR EACH ROW
  WHEN (NEW.numero_lote IS NULL)
  EXECUTE FUNCTION public.generate_lote_number();

-- Updated_at trigger
CREATE TRIGGER update_tiss_lotes_updated_at
  BEFORE UPDATE ON public.tiss_lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
