
-- Adicionar campos bancários na tabela medicos (sem alterar existentes)
ALTER TABLE public.medicos 
ADD COLUMN IF NOT EXISTS banco_nome text,
ADD COLUMN IF NOT EXISTS banco_codigo text,
ADD COLUMN IF NOT EXISTS agencia text,
ADD COLUMN IF NOT EXISTS conta text,
ADD COLUMN IF NOT EXISTS tipo_conta text,
ADD COLUMN IF NOT EXISTS titular_nome text,
ADD COLUMN IF NOT EXISTS titular_cpf_cnpj text,
ADD COLUMN IF NOT EXISTS foto_url text,
ADD COLUMN IF NOT EXISTS bio text;

-- Tabela locais_atendimento
CREATE TABLE public.locais_atendimento (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  medico_id uuid REFERENCES public.medicos(id) ON DELETE CASCADE NOT NULL,
  nome_local text NOT NULL,
  tipo_atendimento text NOT NULL CHECK (tipo_atendimento IN ('presencial', 'online', 'hibrido')),
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.locais_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for development" ON public.locais_atendimento
FOR ALL USING (true) WITH CHECK (true);

-- Tabela agenda_slots
CREATE TABLE public.agenda_slots (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  medico_id uuid REFERENCES public.medicos(id) ON DELETE CASCADE NOT NULL,
  local_id uuid REFERENCES public.locais_atendimento(id) ON DELETE CASCADE NOT NULL,
  data_hora timestamp with time zone NOT NULL,
  disponivel boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.agenda_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for development" ON public.agenda_slots
FOR ALL USING (true) WITH CHECK (true);

-- Tabela medico_servicos
CREATE TABLE public.medico_servicos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  medico_id uuid REFERENCES public.medicos(id) ON DELETE CASCADE NOT NULL,
  nome_servico text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.medico_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for development" ON public.medico_servicos
FOR ALL USING (true) WITH CHECK (true);

-- Tabela avaliacoes_medico
CREATE TABLE public.avaliacoes_medico (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  medico_id uuid REFERENCES public.medicos(id) ON DELETE CASCADE NOT NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  resposta_medico text,
  aprovada_admin boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.avaliacoes_medico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for development" ON public.avaliacoes_medico
FOR ALL USING (true) WITH CHECK (true);
