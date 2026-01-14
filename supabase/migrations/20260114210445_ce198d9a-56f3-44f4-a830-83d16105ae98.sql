-- Criar tabela para reações de mensagens
CREATE TABLE public.chat_mensagens_reacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID NOT NULL REFERENCES public.chat_mensagens(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('admin_clinica', 'medico', 'funcionario')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mensagem_id, emoji, usuario_id),
  UNIQUE(mensagem_id, emoji, usuario_clinica_id),
  UNIQUE(mensagem_id, emoji, medico_id)
);

-- Habilitar RLS
ALTER TABLE public.chat_mensagens_reacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para reações
CREATE POLICY "Usuários podem ver todas as reações da conversa"
ON public.chat_mensagens_reacoes
FOR SELECT
USING (true);

CREATE POLICY "Usuários podem adicionar reações"
ON public.chat_mensagens_reacoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários podem remover suas próprias reações"
ON public.chat_mensagens_reacoes
FOR DELETE
USING (
  (auth.uid()::text = usuario_id::text) OR
  (auth.uid()::text = usuario_clinica_id::text) OR
  (auth.uid()::text = medico_id::text)
);

-- Criar índice para performance
CREATE INDEX idx_chat_reacoes_mensagem_id ON public.chat_mensagens_reacoes(mensagem_id);