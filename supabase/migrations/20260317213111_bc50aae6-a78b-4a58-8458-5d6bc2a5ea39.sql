
ALTER TABLE public.trip_itinerary_activities 
ADD COLUMN IF NOT EXISTS document_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS maps_url text DEFAULT NULL;
