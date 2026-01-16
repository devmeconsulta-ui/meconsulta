
-- Tabela de funis do CRM
CREATE TABLE public.crm_funis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de etapas/colunas do funil
CREATE TABLE public.crm_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#3b82f6',
  ordem INTEGER NOT NULL DEFAULT 0,
  pode_ganhar BOOLEAN DEFAULT false,
  pode_criar BOOLEAN DEFAULT true,
  tempo_estagnacao_dias INTEGER DEFAULT 0,
  probabilidade_ganho INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de leads/oportunidades
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.crm_etapas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  valor_estimado NUMERIC DEFAULT 0,
  origem VARCHAR(50) DEFAULT 'manual', -- 'online' ou 'manual'
  responsavel_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  data_vencimento DATE,
  observacoes TEXT,
  tags TEXT[],
  ordem INTEGER DEFAULT 0,
  ganho BOOLEAN DEFAULT false,
  perdido BOOLEAN DEFAULT false,
  motivo_perda TEXT,
  data_ganho TIMESTAMP WITH TIME ZONE,
  data_perda TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de movimentações do lead
CREATE TABLE public.crm_leads_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  etapa_anterior_id UUID REFERENCES public.crm_etapas(id) ON DELETE SET NULL,
  etapa_nova_id UUID NOT NULL REFERENCES public.crm_etapas(id) ON DELETE CASCADE,
  usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  descricao TEXT,
  automatico BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_funis_clinica ON public.crm_funis(clinica_id);
CREATE INDEX idx_crm_etapas_funil ON public.crm_etapas(funil_id);
CREATE INDEX idx_crm_leads_clinica ON public.crm_leads(clinica_id);
CREATE INDEX idx_crm_leads_funil ON public.crm_leads(funil_id);
CREATE INDEX idx_crm_leads_etapa ON public.crm_leads(etapa_id);
CREATE INDEX idx_crm_leads_origem ON public.crm_leads(origem);
CREATE INDEX idx_crm_leads_historico_lead ON public.crm_leads_historico(lead_id);

-- RLS Policies
ALTER TABLE public.crm_funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for crm_funis" ON public.crm_funis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_etapas" ON public.crm_etapas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_leads" ON public.crm_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_leads_historico" ON public.crm_leads_historico FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_funis_updated_at BEFORE UPDATE ON public.crm_funis FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER update_crm_etapas_updated_at BEFORE UPDATE ON public.crm_etapas FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
