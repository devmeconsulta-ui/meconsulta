-- Create storage bucket for omnichannel files (audio, images, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'omni-files',
  'omni-files',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/wav', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create policies for omni-files bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload omni files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'omni-files');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read omni files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'omni-files');

-- Allow public read access for public bucket
CREATE POLICY "Public can read omni files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'omni-files');

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete omni files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'omni-files');