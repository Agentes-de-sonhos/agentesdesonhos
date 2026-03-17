
-- Add image_url column to trip_services for a cover image per service
ALTER TABLE public.trip_services ADD COLUMN image_url text;

-- Create table for period-level images in the day-by-day itinerary
CREATE TABLE public.trip_itinerary_period_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('morning', 'afternoon', 'evening')),
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, day_date, period)
);

-- Enable RLS
ALTER TABLE public.trip_itinerary_period_images ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage period images for their own trips
CREATE POLICY "Users can view their trip period images"
ON public.trip_itinerary_period_images FOR SELECT
TO authenticated
USING (trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert period images for their trips"
ON public.trip_itinerary_period_images FOR INSERT
TO authenticated
WITH CHECK (trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their trip period images"
ON public.trip_itinerary_period_images FOR UPDATE
TO authenticated
USING (trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their trip period images"
ON public.trip_itinerary_period_images FOR DELETE
TO authenticated
USING (trip_id IN (SELECT id FROM public.trips WHERE user_id = auth.uid()));
