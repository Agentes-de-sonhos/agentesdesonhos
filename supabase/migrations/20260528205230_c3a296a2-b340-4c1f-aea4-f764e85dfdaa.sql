
-- Add notification/attendance tracking to lead tables
ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;

ALTER TABLE public.sales_landing_leads
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;

-- Enable realtime broadcasting for sales_landing_leads (lead_captures already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales_landing_leads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_landing_leads';
  END IF;
END $$;

-- Ensure full row payloads for realtime updates
ALTER TABLE public.lead_captures REPLICA IDENTITY FULL;
ALTER TABLE public.sales_landing_leads REPLICA IDENTITY FULL;
