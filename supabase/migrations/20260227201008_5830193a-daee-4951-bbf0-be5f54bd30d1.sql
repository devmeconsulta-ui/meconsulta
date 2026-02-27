
-- Create whatsapp_logs table for error logging
CREATE TABLE public.whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id uuid REFERENCES public.clinicas(id),
  instancia_id uuid,
  acao text NOT NULL,
  status text NOT NULL DEFAULT 'error',
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics can view their own logs" ON public.whatsapp_logs
  FOR SELECT USING (true);

CREATE POLICY "System can insert logs" ON public.whatsapp_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_whatsapp_logs_clinica ON public.whatsapp_logs(clinica_id);
CREATE INDEX idx_whatsapp_logs_created ON public.whatsapp_logs(created_at DESC);
