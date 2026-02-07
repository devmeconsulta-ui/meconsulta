-- Create omni_ia_agentes table to store AI agent configurations
CREATE TABLE public.omni_ia_agentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  modelo TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  avatar_url TEXT,
  comunicacao TEXT NOT NULL DEFAULT 'normal' CHECK (comunicacao IN ('formal', 'normal', 'descontraida')),
  comportamento TEXT,
  finalidade TEXT NOT NULL DEFAULT 'suporte' CHECK (finalidade IN ('suporte', 'vendas', 'pessoal')),
  produto TEXT,
  site_url TEXT,
  descricao_produto TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  fila_operacao_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  -- Configurações de comportamento
  transferir_para_humano BOOLEAN NOT NULL DEFAULT true,
  usar_emojis BOOLEAN NOT NULL DEFAULT true,
  assinar_nome BOOLEAN NOT NULL DEFAULT false,
  restringir_temas BOOLEAN NOT NULL DEFAULT false,
  dividir_resposta BOOLEAN NOT NULL DEFAULT false,
  permitir_lembretes BOOLEAN NOT NULL DEFAULT false,
  busca_treinamento BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  tempo_resposta INTEGER NOT NULL DEFAULT 5,
  limite_interacoes INTEGER NOT NULL DEFAULT 0,
  -- Follow-ups de inatividade (JSONB array)
  acoes_followup JSONB DEFAULT '[]'::jsonb,
  -- Transferência automática
  palavras_chave_transferencia TEXT[] DEFAULT ARRAY[]::TEXT[],
  fila_transferencia_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create omni_ia_treinamentos table to store training data
CREATE TABLE public.omni_ia_treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.omni_ia_agentes(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'website', 'video', 'documento')),
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'treinado', 'erro')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create omni_ia_intencoes table to store intent webhooks
CREATE TABLE public.omni_ia_intencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.omni_ia_agentes(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  descricao TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create omni_ia_conversas table to track AI conversation history
CREATE TABLE public.omni_ia_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.omni_atendimentos(id) ON DELETE CASCADE,
  agente_id UUID NOT NULL REFERENCES public.omni_ia_agentes(id) ON DELETE CASCADE,
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  interacoes_count INTEGER NOT NULL DEFAULT 0,
  transferido_para_humano BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.omni_ia_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_ia_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_ia_intencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_ia_conversas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for development (consistent with existing tables)
CREATE POLICY "Allow all for omni_ia_agentes"
ON public.omni_ia_agentes FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for omni_ia_treinamentos"
ON public.omni_ia_treinamentos FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for omni_ia_intencoes"
ON public.omni_ia_intencoes FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for omni_ia_conversas"
ON public.omni_ia_conversas FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger for agentes
CREATE TRIGGER update_omni_ia_agentes_updated_at
BEFORE UPDATE ON public.omni_ia_agentes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for conversas
CREATE TRIGGER update_omni_ia_conversas_updated_at
BEFORE UPDATE ON public.omni_ia_conversas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_omni_ia_agentes_clinica ON public.omni_ia_agentes(clinica_id);
CREATE INDEX idx_omni_ia_agentes_fila ON public.omni_ia_agentes(fila_operacao_id);
CREATE INDEX idx_omni_ia_treinamentos_agente ON public.omni_ia_treinamentos(agente_id);
CREATE INDEX idx_omni_ia_conversas_atendimento ON public.omni_ia_conversas(atendimento_id);
CREATE INDEX idx_omni_ia_conversas_agente ON public.omni_ia_conversas(agente_id);