
-- Table to log WhatsApp test/debug sends
CREATE TABLE public.whatsapp_message_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id uuid REFERENCES public.clinicas(id),
  instancia_id uuid REFERENCES public.omni_instancias(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'zapi',
  "to" text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics can view their own logs"
  ON public.whatsapp_message_logs FOR SELECT
  USING (true);

CREATE POLICY "System can insert logs"
  ON public.whatsapp_message_logs FOR INSERT
  WITH CHECK (true);
