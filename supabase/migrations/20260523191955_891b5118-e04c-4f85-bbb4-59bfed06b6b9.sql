ALTER TABLE public.itinerary_activities
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS document_urls text[] NOT NULL DEFAULT '{}';