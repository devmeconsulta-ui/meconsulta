-- Criar tabela de conversas/canais de chat
CREATE TABLE public.chat_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'grupo' CHECK (tipo IN ('grupo', 'privado')),
  nome VARCHAR(255),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de participantes de conversas
CREATE TABLE public.chat_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo_participante VARCHAR(30) NOT NULL CHECK (tipo_participante IN ('admin_clinica', 'medico', 'funcionario')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ultima_leitura TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT chk_participante_um_tipo CHECK (
    (usuario_id IS NOT NULL AND usuario_clinica_id IS NULL AND medico_id IS NULL) OR
    (usuario_id IS NULL AND usuario_clinica_id IS NOT NULL AND medico_id IS NULL) OR
    (usuario_id IS NULL AND usuario_clinica_id IS NULL AND medico_id IS NOT NULL)
  )
);

-- Criar tabela de mensagens
CREATE TABLE public.chat_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  remetente_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  remetente_usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id) ON DELETE SET NULL,
  remetente_medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  tipo_remetente VARCHAR(30) NOT NULL CHECK (tipo_remetente IN ('admin_clinica', 'medico', 'funcionario')),
  conteudo TEXT,
  tipo_mensagem VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo_mensagem IN ('texto', 'imagem', 'arquivo', 'sistema')),
  arquivo_url TEXT,
  arquivo_nome VARCHAR(255),
  arquivo_tipo VARCHAR(100),
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_chat_conversas_clinica ON public.chat_conversas(clinica_id);
CREATE INDEX idx_chat_participantes_conversa ON public.chat_participantes(conversa_id);
CREATE INDEX idx_chat_participantes_usuario ON public.chat_participantes(usuario_id);
CREATE INDEX idx_chat_participantes_usuario_clinica ON public.chat_participantes(usuario_clinica_id);
CREATE INDEX idx_chat_participantes_medico ON public.chat_participantes(medico_id);
CREATE INDEX idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id);
CREATE INDEX idx_chat_mensagens_created ON public.chat_mensagens(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chat_conversas_updated_at
  BEFORE UPDATE ON public.chat_conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_mensagens_updated_at
  BEFORE UPDATE ON public.chat_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas (sistema usa autenticação customizada via localStorage)
CREATE POLICY "Allow all operations on chat_conversas" ON public.chat_conversas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_participantes" ON public.chat_participantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_mensagens" ON public.chat_mensagens FOR ALL USING (true) WITH CHECK (true);

-- Criar bucket para arquivos do chat
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Políticas para storage do chat
CREATE POLICY "Allow public read on chat-files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');
CREATE POLICY "Allow authenticated upload on chat-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Allow update on chat-files" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-files');
CREATE POLICY "Allow delete on chat-files" ON storage.objects FOR DELETE USING (bucket_id = 'chat-files');