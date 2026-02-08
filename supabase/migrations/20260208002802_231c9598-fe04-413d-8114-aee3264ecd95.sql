-- Habilitar extensões necessárias para CRON jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar o processamento de follow-ups a cada 2 minutos
SELECT cron.schedule(
  'process-ai-followups',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/omni-process-followups',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cWNlYWlsaXZqamFjdnF6Zm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MDM4OTYsImV4cCI6MjA4MDM3OTg5Nn0.5nj1s3RcqwyOKPrtSiO6ZvUnv6EbK3z1rdIBNQ4Mh6w"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);