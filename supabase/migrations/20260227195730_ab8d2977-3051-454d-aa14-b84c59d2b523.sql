
ALTER TABLE public.omni_instancias
  ADD COLUMN IF NOT EXISTS last_history_import_at timestamptz DEFAULT NULL;
