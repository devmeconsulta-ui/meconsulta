CREATE TABLE public.exames_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_min integer NOT NULL DEFAULT 30,
  valor numeric NOT NULL DEFAULT 0,
  preparo text,
  cor text NOT NULL DEFAULT '#0ea5e9',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames_tipos TO anon, authenticated;
GRANT ALL ON public.exames_tipos TO service_role;
ALTER TABLE public.exames_tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exames_tipos acesso" ON public.exames_tipos FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_exames_tipos_updated BEFORE UPDATE ON public.exames_tipos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exames_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exame_tipo_id uuid NOT NULL REFERENCES public.exames_tipos(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exame_tipo_id, medico_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames_medicos TO anon, authenticated;
GRANT ALL ON public.exames_medicos TO service_role;
ALTER TABLE public.exames_medicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exames_medicos acesso" ON public.exames_medicos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.agenda_slots ADD COLUMN exame_tipo_id uuid REFERENCES public.exames_tipos(id) ON DELETE SET NULL;
ALTER TABLE public.consultas ADD COLUMN exame_tipo_id uuid REFERENCES public.exames_tipos(id) ON DELETE SET NULL;
CREATE INDEX idx_agenda_slots_exame ON public.agenda_slots(exame_tipo_id);
CREATE INDEX idx_consultas_exame ON public.consultas(exame_tipo_id);