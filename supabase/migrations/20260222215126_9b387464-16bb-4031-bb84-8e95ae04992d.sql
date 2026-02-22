
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule news curation at 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'curate-news-morning',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/curate-news',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3dwY2thaGhmc2l4cGx4d2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MDMzMzAsImV4cCI6MjA4NTM3OTMzMH0.9cVOx00hvKYez4d05GYggDlMDDu4gXJXM7v-RUZistM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule news curation at 16:00 BRT (19:00 UTC)
SELECT cron.schedule(
  'curate-news-afternoon',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/curate-news',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3dwY2thaGhmc2l4cGx4d2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MDMzMzAsImV4cCI6MjA4NTM3OTMzMH0.9cVOx00hvKYez4d05GYggDlMDDu4gXJXM7v-RUZistM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
