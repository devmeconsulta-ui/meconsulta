-- Create permissive RLS policies for omni-files bucket to allow uploads
-- These policies allow authenticated and anon users to upload/read files

-- Policy for public read access
CREATE POLICY "Allow public read omni-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'omni-files');

-- Policy for authenticated insert (upload)
CREATE POLICY "Allow authenticated insert omni-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'omni-files');

-- Policy for authenticated update
CREATE POLICY "Allow authenticated update omni-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'omni-files');

-- Policy for authenticated delete
CREATE POLICY "Allow authenticated delete omni-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'omni-files');