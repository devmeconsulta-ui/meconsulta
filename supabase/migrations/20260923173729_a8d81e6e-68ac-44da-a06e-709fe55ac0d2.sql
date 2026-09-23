
-- =======================
-- WhatsApp Cloud API (Meta) - integração independente
-- =======================

CREATE TABLE public.wac_conexoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  verified_name TEXT,
  verify_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inativo',
  ultimo_erro TEXT,
  ultimo_teste_em TIMESTAMPTZ,
  token_atualizado_em TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone_number_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_conexoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_conexoes TO anon;
GRANT ALL ON public.wac_conexoes TO service_role;
ALTER TABLE public.wac_conexoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for wac_conexoes" ON public.wac_conexoes FOR ALL USING (true) WITH CHECK (true);

-- Tokens: tabela separada, sem acesso do navegador
CREATE TABLE public.wac_conexoes_secrets (
  conexao_id UUID NOT NULL PRIMARY KEY REFERENCES public.wac_conexoes(id) ON DELETE CASCADE,
  access_token_enc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.wac_conexoes_secrets TO service_role;
ALTER TABLE public.wac_conexoes_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for wac_conexoes_secrets" ON public.wac_conexoes_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.wac_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conexao_id UUID NOT NULL REFERENCES public.wac_conexoes(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  wa_id TEXT NOT NULL,
  nome TEXT,
  foto_url TEXT,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conexao_id, wa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_contatos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_contatos TO anon;
GRANT ALL ON public.wac_contatos TO service_role;
ALTER TABLE public.wac_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for wac_contatos" ON public.wac_contatos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.wac_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conexao_id UUID NOT NULL REFERENCES public.wac_conexoes(id) ON DELETE CASCADE,
  contato_id UUID NOT NULL REFERENCES public.wac_contatos(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  ultima_mensagem TEXT,
  ultima_mensagem_em TIMESTAMPTZ,
  nao_lidas INTEGER NOT NULL DEFAULT 0,
  janela_expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conexao_id, contato_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_conversas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_conversas TO anon;
GRANT ALL ON public.wac_conversas TO service_role;
ALTER TABLE public.wac_conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for wac_conversas" ON public.wac_conversas FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.wac_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.wac_conversas(id) ON DELETE CASCADE,
  conexao_id UUID NOT NULL REFERENCES public.wac_conexoes(id) ON DELETE CASCADE,
  wamid TEXT,
  direcao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'text',
  conteudo TEXT,
  media_url TEXT,
  media_mime TEXT,
  media_id TEXT,
  filename TEXT,
  template_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  enviado_por TEXT,
  timestamp_meta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wamid)
);

CREATE INDEX idx_wac_mensagens_conversa ON public.wac_mensagens(conversa_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wac_mensagens TO anon;
GRANT ALL ON public.wac_mensagens TO service_role;
ALTER TABLE public.wac_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for wac_mensagens" ON public.wac_mensagens FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.wac_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conexao_id UUID REFERENCES public.wac_conexoes(id) ON DELETE CASCADE,
  mensagem_id UUID REFERENCES public.wac_mensagens(id) ON DELETE CASCADE,
  wamid TEXT,
  status TEXT NOT NULL,
  erro_codigo TEXT,
  erro_mensagem TEXT,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wac_eventos_wamid ON public.wac_eventos(wamid);

GRANT SELECT ON public.wac_eventos TO authenticated;
GRANT SELECT ON public.wac_eventos TO anon;
GRANT ALL ON public.wac_eventos TO service_role;
ALTER TABLE public.wac_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read wac_eventos" ON public.wac_eventos FOR SELECT USING (true);

-- updated_at triggers
CREATE TRIGGER trg_wac_conexoes_updated BEFORE UPDATE ON public.wac_conexoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wac_conexoes_secrets_updated BEFORE UPDATE ON public.wac_conexoes_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wac_contatos_updated BEFORE UPDATE ON public.wac_contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wac_conversas_updated BEFORE UPDATE ON public.wac_conversas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wac_mensagens_updated BEFORE UPDATE ON public.wac_mensagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER TABLE public.wac_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.wac_conversas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wac_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wac_conversas;
