-- =============================================
-- MÓDULO OMNICHANNEL - ESTRUTURA DE BANCO DE DADOS
-- =============================================

-- 1. OMNI_INSTANCIAS - Gerenciar instâncias WhatsApp
CREATE TABLE public.omni_instancias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  numero_whatsapp VARCHAR(20),
  evolution_instance_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  webhook_url TEXT,
  api_key_hash TEXT,
  servidor_url TEXT,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_instancias_status_check CHECK (status IN ('disconnected', 'connecting', 'connected'))
);

-- 2. OMNI_FILAS - Filas de atendimento
CREATE TABLE public.omni_filas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  instancia_id UUID REFERENCES public.omni_instancias(id) ON DELETE SET NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(20) DEFAULT '#3b82f6',
  atendimentos_max_agente INTEGER DEFAULT 5,
  estrategia_distribuicao VARCHAR(30) DEFAULT 'round_robin',
  fechar_por_inatividade_minutos INTEGER DEFAULT 60,
  mensagem_boas_vindas TEXT,
  mensagem_fora_horario TEXT,
  mensagem_fechamento TEXT,
  mensagem_espera TEXT,
  horario_funcionamento JSONB DEFAULT '{"inicio": "08:00", "fim": "18:00", "dias_semana": [1,2,3,4,5]}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_filas_estrategia_check CHECK (estrategia_distribuicao IN ('round_robin', 'menos_ocupado', 'aleatorio', 'manual'))
);

-- 3. OMNI_PAUSAS_TIPOS - Tipos de pausa
CREATE TABLE public.omni_pausas_tipos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  tempo_max_minutos INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. OMNI_AGENTES - Agentes por fila
CREATE TABLE public.omni_agentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fila_id UUID NOT NULL REFERENCES public.omni_filas(id) ON DELETE CASCADE,
  usuario_clinica_id UUID NOT NULL REFERENCES public.usuarios_clinica(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline',
  motivo_pausa VARCHAR(100),
  max_atendimentos_simultaneos INTEGER DEFAULT 5,
  tempo_logado_hoje INTEGER DEFAULT 0,
  atendimentos_hoje INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_agentes_status_check CHECK (status IN ('online', 'offline', 'pausa', 'ocupado')),
  CONSTRAINT omni_agentes_unique UNIQUE (fila_id, usuario_clinica_id)
);

-- 5. OMNI_CONTATOS - Contatos/Clientes
CREATE TABLE public.omni_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  documento VARCHAR(20),
  email VARCHAR(150),
  instagram VARCHAR(100),
  foto_url TEXT,
  etiquetas TEXT[] DEFAULT '{}',
  agente_preferencial_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  empresa VARCHAR(150),
  observacoes TEXT,
  dados_extras JSONB DEFAULT '{}'::jsonb,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_contatos_unique_telefone UNIQUE (clinica_id, telefone)
);

-- 6. OMNI_ATENDIMENTOS - Conversas/Tickets
CREATE TABLE public.omni_atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  fila_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  contato_id UUID NOT NULL REFERENCES public.omni_contatos(id) ON DELETE CASCADE,
  agente_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  protocolo SERIAL,
  status VARCHAR(30) NOT NULL DEFAULT 'aguardando',
  canal VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  prioridade VARCHAR(20) DEFAULT 'normal',
  motivo_fechamento TEXT,
  avaliacao_nota INTEGER,
  avaliacao_comentario TEXT,
  tempo_primeira_resposta INTEGER,
  tempo_total_atendimento INTEGER,
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_primeira_resposta TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  transferido_de_agente_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  transferido_de_fila_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  etiquetas TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_atendimentos_status_check CHECK (status IN ('aguardando', 'em_atendimento', 'finalizado', 'abandonado')),
  CONSTRAINT omni_atendimentos_canal_check CHECK (canal IN ('whatsapp', 'instagram', 'telegram')),
  CONSTRAINT omni_atendimentos_prioridade_check CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'))
);

-- 7. OMNI_MENSAGENS - Mensagens das conversas
CREATE TABLE public.omni_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID NOT NULL REFERENCES public.omni_atendimentos(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.omni_contatos(id) ON DELETE SET NULL,
  agente_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'texto',
  direcao VARCHAR(10) NOT NULL,
  conteudo TEXT,
  arquivo_url TEXT,
  arquivo_nome VARCHAR(255),
  arquivo_tipo VARCHAR(100),
  whatsapp_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'enviada',
  erro_descricao TEXT,
  quoted_message_id UUID REFERENCES public.omni_mensagens(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_mensagens_tipo_check CHECK (tipo IN ('texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'contato', 'sticker')),
  CONSTRAINT omni_mensagens_direcao_check CHECK (direcao IN ('entrada', 'saida')),
  CONSTRAINT omni_mensagens_status_check CHECK (status IN ('enviada', 'entregue', 'lida', 'erro'))
);

-- 8. OMNI_MENSAGENS_RAPIDAS - Templates de resposta
CREATE TABLE public.omni_mensagens_rapidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  fila_id UUID REFERENCES public.omni_filas(id) ON DELETE SET NULL,
  titulo VARCHAR(100) NOT NULL,
  atalho VARCHAR(50),
  conteudo TEXT NOT NULL,
  categoria VARCHAR(50),
  variaveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. OMNI_ETIQUETAS - Etiquetas para contatos/atendimentos
CREATE TABLE public.omni_etiquetas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  cor VARCHAR(20) DEFAULT '#6366f1',
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT omni_etiquetas_unique UNIQUE (clinica_id, nome)
);

-- 10. OMNI_AGENTE_PAUSAS - Histórico de pausas
CREATE TABLE public.omni_agente_pausas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES public.omni_agentes(id) ON DELETE CASCADE,
  tipo_pausa_id UUID REFERENCES public.omni_pausas_tipos(id) ON DELETE SET NULL,
  inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fim TIMESTAMP WITH TIME ZONE,
  duracao_segundos INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_omni_instancias_clinica ON public.omni_instancias(clinica_id);
CREATE INDEX idx_omni_instancias_status ON public.omni_instancias(status);

CREATE INDEX idx_omni_filas_clinica ON public.omni_filas(clinica_id);
CREATE INDEX idx_omni_filas_instancia ON public.omni_filas(instancia_id);

CREATE INDEX idx_omni_agentes_fila ON public.omni_agentes(fila_id);
CREATE INDEX idx_omni_agentes_usuario ON public.omni_agentes(usuario_clinica_id);
CREATE INDEX idx_omni_agentes_status ON public.omni_agentes(status);

CREATE INDEX idx_omni_contatos_clinica ON public.omni_contatos(clinica_id);
CREATE INDEX idx_omni_contatos_telefone ON public.omni_contatos(telefone);
CREATE INDEX idx_omni_contatos_paciente ON public.omni_contatos(paciente_id);

CREATE INDEX idx_omni_atendimentos_clinica ON public.omni_atendimentos(clinica_id);
CREATE INDEX idx_omni_atendimentos_fila ON public.omni_atendimentos(fila_id);
CREATE INDEX idx_omni_atendimentos_contato ON public.omni_atendimentos(contato_id);
CREATE INDEX idx_omni_atendimentos_agente ON public.omni_atendimentos(agente_id);
CREATE INDEX idx_omni_atendimentos_status ON public.omni_atendimentos(status);
CREATE INDEX idx_omni_atendimentos_data ON public.omni_atendimentos(data_abertura);

CREATE INDEX idx_omni_mensagens_atendimento ON public.omni_mensagens(atendimento_id);
CREATE INDEX idx_omni_mensagens_whatsapp_id ON public.omni_mensagens(whatsapp_message_id);
CREATE INDEX idx_omni_mensagens_created ON public.omni_mensagens(created_at);

CREATE INDEX idx_omni_mensagens_rapidas_clinica ON public.omni_mensagens_rapidas(clinica_id);
CREATE INDEX idx_omni_mensagens_rapidas_atalho ON public.omni_mensagens_rapidas(atalho);

CREATE INDEX idx_omni_etiquetas_clinica ON public.omni_etiquetas(clinica_id);

CREATE INDEX idx_omni_agente_pausas_agente ON public.omni_agente_pausas(agente_id);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE TRIGGER update_omni_instancias_updated_at
  BEFORE UPDATE ON public.omni_instancias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_filas_updated_at
  BEFORE UPDATE ON public.omni_filas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_agentes_updated_at
  BEFORE UPDATE ON public.omni_agentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_contatos_updated_at
  BEFORE UPDATE ON public.omni_contatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_atendimentos_updated_at
  BEFORE UPDATE ON public.omni_atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_mensagens_updated_at
  BEFORE UPDATE ON public.omni_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omni_mensagens_rapidas_updated_at
  BEFORE UPDATE ON public.omni_mensagens_rapidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.omni_instancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_filas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_pausas_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_mensagens_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omni_agente_pausas ENABLE ROW LEVEL SECURITY;

-- Policies para omni_instancias
CREATE POLICY "Allow all for omni_instancias" ON public.omni_instancias FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_filas
CREATE POLICY "Allow all for omni_filas" ON public.omni_filas FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_pausas_tipos
CREATE POLICY "Allow all for omni_pausas_tipos" ON public.omni_pausas_tipos FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_agentes
CREATE POLICY "Allow all for omni_agentes" ON public.omni_agentes FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_contatos
CREATE POLICY "Allow all for omni_contatos" ON public.omni_contatos FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_atendimentos
CREATE POLICY "Allow all for omni_atendimentos" ON public.omni_atendimentos FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_mensagens
CREATE POLICY "Allow all for omni_mensagens" ON public.omni_mensagens FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_mensagens_rapidas
CREATE POLICY "Allow all for omni_mensagens_rapidas" ON public.omni_mensagens_rapidas FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_etiquetas
CREATE POLICY "Allow all for omni_etiquetas" ON public.omni_etiquetas FOR ALL USING (true) WITH CHECK (true);

-- Policies para omni_agente_pausas
CREATE POLICY "Allow all for omni_agente_pausas" ON public.omni_agente_pausas FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INSERIR TIPOS DE PAUSA PADRÃO
-- =============================================

-- Será inserido dinamicamente quando a clínica criar suas primeiras configurações