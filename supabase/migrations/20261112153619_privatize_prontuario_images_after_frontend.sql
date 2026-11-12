-- Apply after the updated frontend and Edge Functions are published.
ALTER TABLE public.prontuario_imagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for prontuario_imagens" ON public.prontuario_imagens;
REVOKE ALL ON public.prontuario_imagens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.prontuario_imagens TO service_role;

UPDATE storage.buckets SET public = false, file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'prontuario-imagens';

DROP POLICY IF EXISTS "Allow public read prontuario-imagens" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload prontuario-imagens" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete prontuario-imagens" ON storage.objects;
-- Restrictive guards also block this bucket when another bucket's pre-existing
-- permissive policy happens to grant access to all objects.
CREATE POLICY "prontuario photos server only select" ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (bucket_id <> 'prontuario-imagens');
CREATE POLICY "prontuario photos server only insert" ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (bucket_id <> 'prontuario-imagens');
CREATE POLICY "prontuario photos server only update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (bucket_id <> 'prontuario-imagens') WITH CHECK (bucket_id <> 'prontuario-imagens');
CREATE POLICY "prontuario photos server only delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (bucket_id <> 'prontuario-imagens');
