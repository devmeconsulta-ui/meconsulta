
-- Add webhook tracking columns to omni_instancias
ALTER TABLE public.omni_instancias
  ADD COLUMN IF NOT EXISTS webhooks_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhooks_configured_at timestamp with time zone;
