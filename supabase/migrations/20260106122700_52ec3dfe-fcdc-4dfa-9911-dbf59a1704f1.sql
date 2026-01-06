-- Create centros_custo table for clinics
CREATE TABLE public.centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contas_pagar table for clinics
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  fornecedor VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contas_receber table for clinics  
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  cliente VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medico_repasse_config table for clinic-specific doctor repasse settings
CREATE TABLE public.medico_repasse_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  percentual_repasse DECIMAL(5,2) DEFAULT 70.00,
  valor_fixo_repasse DECIMAL(10,2),
  tipo_repasse VARCHAR(20) DEFAULT 'percentual',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, medico_id)
);

-- Enable RLS
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medico_repasse_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for centros_custo
CREATE POLICY "Clinics can view their own cost centers" ON public.centros_custo
  FOR SELECT USING (true);

CREATE POLICY "Clinics can insert their own cost centers" ON public.centros_custo
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinics can update their own cost centers" ON public.centros_custo
  FOR UPDATE USING (true);

CREATE POLICY "Clinics can delete their own cost centers" ON public.centros_custo
  FOR DELETE USING (true);

-- RLS Policies for contas_pagar
CREATE POLICY "Clinics can view their own payables" ON public.contas_pagar
  FOR SELECT USING (true);

CREATE POLICY "Clinics can insert their own payables" ON public.contas_pagar
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinics can update their own payables" ON public.contas_pagar
  FOR UPDATE USING (true);

CREATE POLICY "Clinics can delete their own payables" ON public.contas_pagar
  FOR DELETE USING (true);

-- RLS Policies for contas_receber
CREATE POLICY "Clinics can view their own receivables" ON public.contas_receber
  FOR SELECT USING (true);

CREATE POLICY "Clinics can insert their own receivables" ON public.contas_receber
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinics can update their own receivables" ON public.contas_receber
  FOR UPDATE USING (true);

CREATE POLICY "Clinics can delete their own receivables" ON public.contas_receber
  FOR DELETE USING (true);

-- RLS Policies for medico_repasse_config
CREATE POLICY "Clinics can view their own repasse config" ON public.medico_repasse_config
  FOR SELECT USING (true);

CREATE POLICY "Clinics can insert their own repasse config" ON public.medico_repasse_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clinics can update their own repasse config" ON public.medico_repasse_config
  FOR UPDATE USING (true);

CREATE POLICY "Clinics can delete their own repasse config" ON public.medico_repasse_config
  FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_medico_repasse_config_updated_at
  BEFORE UPDATE ON public.medico_repasse_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();