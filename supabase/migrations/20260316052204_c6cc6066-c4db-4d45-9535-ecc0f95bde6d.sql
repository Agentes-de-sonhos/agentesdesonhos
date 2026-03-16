
-- Create trip itinerary activities table
CREATE TABLE public.trip_itinerary_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon', 'evening')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT,
  location TEXT,
  notes TEXT,
  linked_service_id UUID REFERENCES public.trip_services(id) ON DELETE SET NULL,
  photo_urls TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_itinerary_activities ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage activities for their own trips
CREATE POLICY "Users can manage their trip itinerary activities"
  ON public.trip_itinerary_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itinerary_activities.trip_id
        AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itinerary_activities.trip_id
        AND trips.user_id = auth.uid()
    )
  );

-- Public read for shared trips (client view)
CREATE POLICY "Public can read itinerary for shared trips"
  ON public.trip_itinerary_activities
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itinerary_activities.trip_id
        AND trips.share_token IS NOT NULL
    )
  );

-- Index for performance
CREATE INDEX idx_trip_itinerary_activities_trip_id ON public.trip_itinerary_activities(trip_id);
CREATE INDEX idx_trip_itinerary_activities_day_date ON public.trip_itinerary_activities(trip_id, day_date, period, order_index);
