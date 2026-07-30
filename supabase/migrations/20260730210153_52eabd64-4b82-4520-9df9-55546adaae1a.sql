ALTER TABLE public.product_landing_leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_landing_leads;