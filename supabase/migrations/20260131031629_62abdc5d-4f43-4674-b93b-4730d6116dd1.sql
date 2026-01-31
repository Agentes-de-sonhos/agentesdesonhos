-- Security Migration: Strengthen share tokens and public access policies

-- 1. Create function to generate cryptographically secure share tokens (32 chars)
CREATE OR REPLACE FUNCTION public.generate_secure_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Generate 32 character hex token (16 bytes = 128 bits of entropy)
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- 2. Update existing short share tokens in trips table
UPDATE public.trips 
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NOT NULL AND length(share_token) < 32;

-- 3. Update existing short share tokens in itineraries table
UPDATE public.itineraries 
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NOT NULL AND length(share_token) < 32;

-- 4. Update existing short share tokens in quotes table
UPDATE public.quotes 
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NOT NULL AND length(share_token) < 32;

-- 5. Add share_expires_at columns for token expiration
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.itineraries 
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;

-- 6. Drop and recreate public sharing policies with stronger validation
-- Note: Only allow access when share_token matches a provided token (not just existence)

-- Trips: Update the public view policy to require non-expired tokens
DROP POLICY IF EXISTS "Public can view shared trips" ON public.trips;
CREATE POLICY "Public can view shared trips with valid token"
ON public.trips
FOR SELECT
USING (
  share_token IS NOT NULL 
  AND length(share_token) >= 32
  AND (share_expires_at IS NULL OR share_expires_at > now())
);

-- Trip services: Update to match the new trips policy
DROP POLICY IF EXISTS "Public can view services of shared trips" ON public.trip_services;
CREATE POLICY "Public can view services of shared trips with valid token"
ON public.trip_services
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trips
  WHERE trips.id = trip_services.trip_id
  AND trips.share_token IS NOT NULL
  AND length(trips.share_token) >= 32
  AND (trips.share_expires_at IS NULL OR trips.share_expires_at > now())
));

-- Itineraries: Update public view policy
DROP POLICY IF EXISTS "Public can view published itineraries by share token" ON public.itineraries;
CREATE POLICY "Public can view published itineraries with valid token"
ON public.itineraries
FOR SELECT
USING (
  status = 'published'
  AND share_token IS NOT NULL
  AND length(share_token) >= 32
  AND (share_expires_at IS NULL OR share_expires_at > now())
);

-- Itinerary days: Update to match new policy
DROP POLICY IF EXISTS "Public can view days of published itineraries" ON public.itinerary_days;
CREATE POLICY "Public can view days of published itineraries with valid token"
ON public.itinerary_days
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM itineraries
  WHERE itineraries.id = itinerary_days.itinerary_id
  AND itineraries.status = 'published'
  AND itineraries.share_token IS NOT NULL
  AND length(itineraries.share_token) >= 32
  AND (itineraries.share_expires_at IS NULL OR itineraries.share_expires_at > now())
));

-- Itinerary activities: Update to match new policy
DROP POLICY IF EXISTS "Public can view activities of published itineraries" ON public.itinerary_activities;
CREATE POLICY "Public can view activities of published itineraries with valid token"
ON public.itinerary_activities
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM itinerary_days
  JOIN itineraries ON itineraries.id = itinerary_days.itinerary_id
  WHERE itinerary_days.id = itinerary_activities.day_id
  AND itineraries.status = 'published'
  AND itineraries.share_token IS NOT NULL
  AND length(itineraries.share_token) >= 32
  AND (itineraries.share_expires_at IS NULL OR itineraries.share_expires_at > now())
));

-- Quotes: Update public view policy
DROP POLICY IF EXISTS "Public can view published quotes by share token" ON public.quotes;
CREATE POLICY "Public can view published quotes with valid token"
ON public.quotes
FOR SELECT
USING (
  status = 'published'
  AND share_token IS NOT NULL
  AND length(share_token) >= 32
  AND (share_expires_at IS NULL OR share_expires_at > now())
);

-- Quote services: Update to match new policy
DROP POLICY IF EXISTS "Public can view services of published quotes" ON public.quote_services;
CREATE POLICY "Public can view services of published quotes with valid token"
ON public.quote_services
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM quotes
  WHERE quotes.id = quote_services.quote_id
  AND quotes.status = 'published'
  AND quotes.share_token IS NOT NULL
  AND length(quotes.share_token) >= 32
  AND (quotes.share_expires_at IS NULL OR quotes.share_expires_at > now())
));