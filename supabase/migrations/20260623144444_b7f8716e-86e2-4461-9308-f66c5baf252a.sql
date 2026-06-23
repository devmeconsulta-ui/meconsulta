
-- Tabela para documentos importados/anexados a pacientes (PDFs, exames, laudos, etc.)
CREATE TABLE IF NOT EXISTS public.paciente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  categoria text DEFAULT 'documento',
  arquivo_url text NOT NULL,
  arquivo_nome text,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  origem_import text DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paciente_documentos_paciente ON public.paciente_documentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_paciente_documentos_clinica ON public.paciente_documentos(clinica_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paciente_documentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paciente_documentos TO anon;
GRANT ALL ON public.paciente_documentos TO service_role;

ALTER TABLE public.paciente_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paciente_documentos_all_access" ON public.paciente_documentos
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_paciente_documentos_updated_at
  BEFORE UPDATE ON public.paciente_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log de importações em lote
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  tipo text NOT NULL,
  origem text,
  arquivo_nome text,
  total_registros integer DEFAULT 0,
  criados integer DEFAULT 0,
  atualizados integer DEFAULT 0,
  erros integer DEFAULT 0,
  detalhes_erros jsonb,
  status text DEFAULT 'concluido',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO anon;
GRANT ALL ON public.import_jobs TO service_role;

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_jobs_all_access" ON public.import_jobs
  FOR ALL USING (true) WITH CHECK (true);
