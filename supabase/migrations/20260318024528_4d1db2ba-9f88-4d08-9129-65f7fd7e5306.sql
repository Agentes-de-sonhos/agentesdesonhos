
-- Add video_url and force-push columns to global_popups
ALTER TABLE public.global_popups 
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS is_forced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forced_at timestamptz;

-- Enable realtime for global_popups so forced popups push instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_popups;
