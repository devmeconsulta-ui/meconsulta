-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles (security best practice - roles in separate table)
CREATE TYPE public.app_role AS ENUM ('admin', 'medico', 'paciente');

-- Table: usuarios (base users table)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('admin', 'medico', 'paciente')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: user_roles (for secure role management)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Table: medicos
CREATE TABLE public.medicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especialidade TEXT,
  crm TEXT,
  valor_consulta NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentual_repasse NUMERIC(5,2) NOT NULL DEFAULT 70,
  pix_key TEXT,
  pix_key_type TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: pacientes
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  data_nascimento DATE,
  asaas_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: consultas
CREATE TABLE public.consultas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  status_consulta TEXT NOT NULL DEFAULT 'aguardando_pagamento' CHECK (status_consulta IN ('aguardando_pagamento', 'confirmada', 'cancelada')),
  valor_consulta NUMERIC(10,2) NOT NULL,
  valor_medico NUMERIC(10,2) NOT NULL,
  valor_plataforma NUMERIC(10,2) NOT NULL,
  asaas_payment_id TEXT,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'falhou')),
  status_repasse TEXT NOT NULL DEFAULT 'pendente' CHECK (status_repasse IN ('pendente', 'pago')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for usuarios (open for development, restrict later)
CREATE POLICY "Allow all for development" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Allow all for development" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for medicos
CREATE POLICY "Allow all for development" ON public.medicos FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for pacientes
CREATE POLICY "Allow all for development" ON public.pacientes FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for consultas
CREATE POLICY "Allow all for development" ON public.consultas FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_medicos_usuario_id ON public.medicos(usuario_id);
CREATE INDEX idx_pacientes_usuario_id ON public.pacientes(usuario_id);
CREATE INDEX idx_consultas_medico_id ON public.consultas(medico_id);
CREATE INDEX idx_consultas_paciente_id ON public.consultas(paciente_id);
CREATE INDEX idx_consultas_data_hora ON public.consultas(data_hora);
CREATE INDEX idx_consultas_status_pagamento ON public.consultas(status_pagamento);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);