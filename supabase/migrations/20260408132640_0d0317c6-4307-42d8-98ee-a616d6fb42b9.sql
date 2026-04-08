CREATE TABLE IF NOT EXISTS public.prontuario_livre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid REFERENCES public.consultas(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  conteudo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prontuario_livre ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for prontuario_livre"
  ON public.prontuario_livre
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_prontuario_livre_updated_at
  BEFORE UPDATE ON public.prontuario_livre
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();