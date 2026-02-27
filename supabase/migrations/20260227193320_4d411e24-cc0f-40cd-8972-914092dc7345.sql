
-- Add provider and Z-API fields to omni_instancias
ALTER TABLE omni_instancias 
  ADD COLUMN IF NOT EXISTS provider varchar NOT NULL DEFAULT 'zapi',
  ADD COLUMN IF NOT EXISTS zapi_instance_id varchar,
  ADD COLUMN IF NOT EXISTS zapi_token varchar;

-- Make evolution_instance_name nullable for Z-API instances
ALTER TABLE omni_instancias ALTER COLUMN evolution_instance_name DROP NOT NULL;

-- Create whatsapp_sync_jobs table
CREATE TABLE IF NOT EXISTS public.whatsapp_sync_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id uuid NOT NULL REFERENCES clinicas(id),
  instancia_id uuid NOT NULL REFERENCES omni_instancias(id) ON DELETE CASCADE,
  status varchar NOT NULL DEFAULT 'queued',
  progress_count integer DEFAULT 0,
  total_count integer DEFAULT 0,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for whatsapp_sync_jobs"
  ON whatsapp_sync_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_sync_jobs_instancia ON whatsapp_sync_jobs(instancia_id);
CREATE INDEX idx_sync_jobs_status ON whatsapp_sync_jobs(status);
