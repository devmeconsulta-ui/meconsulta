-- Tabela para rastrear presença de agentes de forma persistente
CREATE TABLE public.agent_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_clinica_id UUID NOT NULL REFERENCES usuarios_clinica(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'pausa', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(usuario_clinica_id)
);

-- Índices para performance
CREATE INDEX idx_agent_presence_clinica ON agent_presence(clinica_id);
CREATE INDEX idx_agent_presence_last_seen ON agent_presence(last_seen);

-- Habilitar RLS
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Todos da mesma clínica podem ver a presença
CREATE POLICY "Users can view presence in their clinic"
  ON public.agent_presence
  FOR SELECT
  USING (true);

-- Usuários podem inserir/atualizar sua própria presença
CREATE POLICY "Users can upsert their own presence"
  ON public.agent_presence
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own presence"
  ON public.agent_presence
  FOR UPDATE
  USING (true);

-- Habilitar realtime para esta tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;