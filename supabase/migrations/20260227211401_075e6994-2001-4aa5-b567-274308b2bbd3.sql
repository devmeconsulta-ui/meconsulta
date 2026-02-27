
-- 1. Platform integrations (global config for Z-API credentials)
CREATE TABLE IF NOT EXISTS public.platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (tokens inside)
CREATE POLICY "Service role only for platform_integrations"
  ON public.platform_integrations FOR ALL
  USING (false) WITH CHECK (false);

-- 2. Managed instances (per-clinic WhatsApp instances)
CREATE TABLE IF NOT EXISTS public.managed_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  external_instance_id TEXT,
  external_token TEXT,
  phone_number TEXT,
  provider TEXT DEFAULT 'zapi',
  status TEXT DEFAULT 'disconnected',
  webhook_configured BOOLEAN DEFAULT false,
  omni_instancia_id UUID REFERENCES public.omni_instancias(id),
  last_health_check TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.managed_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for managed_instances"
  ON public.managed_instances FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Message outbox (queue for outgoing messages)
CREATE TABLE IF NOT EXISTS public.message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  atendimento_id UUID NOT NULL,
  mensagem_id UUID NOT NULL,
  instance_id UUID REFERENCES public.managed_instances(id),
  status TEXT DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  error TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.message_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for message_outbox"
  ON public.message_outbox FOR ALL
  USING (true) WITH CHECK (true);

-- Index for processing pending messages
CREATE INDEX idx_message_outbox_status ON public.message_outbox(status) WHERE status = 'pending';
CREATE INDEX idx_managed_instances_clinica ON public.managed_instances(clinica_id);
CREATE INDEX idx_managed_instances_status ON public.managed_instances(status);

-- 4. Trigger: auto-enqueue agent messages to outbox
CREATE OR REPLACE FUNCTION public.enqueue_agent_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enqueue outgoing agent messages (not internal notes)
  IF NEW.direcao = 'saida' AND NEW.tipo != 'nota_interna' THEN
    INSERT INTO public.message_outbox (clinica_id, atendimento_id, mensagem_id, payload)
    SELECT
      a.clinica_id,
      NEW.atendimento_id,
      NEW.id,
      jsonb_build_object(
        'phone', c.telefone,
        'message', NEW.conteudo,
        'content_type', COALESCE(NEW.tipo, 'text'),
        'media_url', NEW.arquivo_url,
        'file_name', NEW.arquivo_nome
      )
    FROM public.omni_atendimentos a
    JOIN public.omni_contatos c ON c.id = a.contato_id
    WHERE a.id = NEW.atendimento_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enqueue_agent_message
  AFTER INSERT ON public.omni_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_agent_message();

-- 5. Seed default Z-API config row (empty, to be filled via admin)
INSERT INTO public.platform_integrations (provider, enabled, config)
VALUES ('zapi', false, '{"base_url": "https://api.z-api.io", "global_token": "", "partner_token": ""}')
ON CONFLICT (provider) DO NOTHING;
