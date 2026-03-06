
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT,
  neighborhood TEXT,
  category TEXT,
  star_rating INTEGER,
  price_from NUMERIC,
  review_score NUMERIC,
  breakfast_included BOOLEAN NOT NULL DEFAULT false,
  free_wifi BOOLEAN NOT NULL DEFAULT false,
  parking BOOLEAN NOT NULL DEFAULT false,
  air_conditioning BOOLEAN NOT NULL DEFAULT false,
  pet_friendly BOOLEAN NOT NULL DEFAULT false,
  gym BOOLEAN NOT NULL DEFAULT false,
  spa BOOLEAN NOT NULL DEFAULT false,
  bar BOOLEAN NOT NULL DEFAULT false,
  restaurant BOOLEAN NOT NULL DEFAULT false,
  pool BOOLEAN NOT NULL DEFAULT false,
  accessible BOOLEAN NOT NULL DEFAULT false,
  family_friendly BOOLEAN NOT NULL DEFAULT false,
  brand TEXT,
  property_type TEXT DEFAULT 'Hotel',
  free_cancellation BOOLEAN NOT NULL DEFAULT false,
  special_offers BOOLEAN NOT NULL DEFAULT false,
  favorite_brazilians BOOLEAN NOT NULL DEFAULT false,
  most_booked_brazilians BOOLEAN NOT NULL DEFAULT false,
  iconic_hotel BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  google_maps_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view active hotels" ON public.hotels FOR SELECT TO authenticated USING (is_active = true);

CREATE INDEX idx_hotels_destination ON public.hotels (destination);
CREATE INDEX idx_hotels_city ON public.hotels (city);
CREATE INDEX idx_hotels_category ON public.hotels (category);
