CREATE TABLE public.procedimento_repasse_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  nome_procedimento text NOT NULL,
  tipo_repasse varchar DEFAULT 'percentual',
  percentual_repasse numeric DEFAULT 70.00,
  valor_fixo_repasse numeric,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinica_id, medico_id, nome_procedimento)
);

ALTER TABLE public.procedimento_repasse_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for procedimento_repasse_config"
  ON public.procedimento_repasse_config
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_procedimento_repasse_updated_at
  BEFORE UPDATE ON public.procedimento_repasse_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();