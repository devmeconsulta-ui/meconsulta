
-- Tabela para armazenar a base TUSS gratuita
CREATE TABLE public.tuss_procedimentos (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  codigo_tuss TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  sexo TEXT,
  idade_min INTEGER,
  idade_max INTEGER,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  valor_referencia NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscas rápidas por código
CREATE INDEX idx_tuss_codigo ON public.tuss_procedimentos (codigo_tuss);

-- Índice para buscas por descrição
CREATE INDEX idx_tuss_descricao ON public.tuss_procedimentos USING gin (to_tsvector('portuguese', coalesce(descricao, '')));

-- Enable RLS
ALTER TABLE public.tuss_procedimentos ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública, escrita para clínicas/admin
CREATE POLICY "Todos podem visualizar procedimentos TUSS"
  ON public.tuss_procedimentos FOR SELECT
  USING (true);

CREATE POLICY "Admin e clínicas podem inserir procedimentos TUSS"
  ON public.tuss_procedimentos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin e clínicas podem atualizar procedimentos TUSS"
  ON public.tuss_procedimentos FOR UPDATE
  USING (true);

CREATE POLICY "Admin e clínicas podem deletar procedimentos TUSS"
  ON public.tuss_procedimentos FOR DELETE
  USING (true);
