CREATE TABLE IF NOT EXISTS public.confirmacao_automatica_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  fila_id uuid REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  horas_antes integer NOT NULL DEFAULT 24,
  mensagem_template text,
  intervalo_envio_segundos integer NOT NULL DEFAULT 4,
  incluir_ordem_chegada boolean NOT NULL DEFAULT false,
  horario_envio time NOT NULL DEFAULT '06:00:00',
  dias_semana integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinica_id)
);

ALTER TABLE public.confirmacao_automatica_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for confirmacao_automatica_config"
  ON public.confirmacao_automatica_config
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_confirmacao_automatica_updated_at
  BEFORE UPDATE ON public.confirmacao_automatica_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();