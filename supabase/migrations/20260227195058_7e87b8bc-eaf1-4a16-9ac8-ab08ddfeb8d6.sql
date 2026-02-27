
-- Add new columns to whatsapp_sync_jobs for robust history import
ALTER TABLE public.whatsapp_sync_jobs
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'zapi',
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'history_import',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_chats_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_chats_done integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_messages_done integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cursor_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS days_back integer DEFAULT 30;

-- Rename old columns to match new schema (keep backward compat)
-- progress_count -> mapped to progress_chats_done
-- total_count -> mapped to progress_chats_total
-- error_message -> mapped to last_error

-- Migrate existing data from old columns to new ones
UPDATE public.whatsapp_sync_jobs
SET progress_chats_total = COALESCE(total_count, 0),
    progress_chats_done = COALESCE(progress_count, 0),
    last_error = error_message
WHERE progress_chats_total = 0 OR progress_chats_done = 0;

-- Create index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_sync_jobs_instance_status 
  ON public.whatsapp_sync_jobs(instancia_id, status);
