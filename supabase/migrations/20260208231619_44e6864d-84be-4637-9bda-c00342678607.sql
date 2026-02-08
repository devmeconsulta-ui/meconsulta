-- Update allowed mime types for omni-files bucket to include all audio formats
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'omni-files';