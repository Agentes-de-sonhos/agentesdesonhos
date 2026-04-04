-- Add origin column to track how each activity was created
ALTER TABLE public.trip_itinerary_activities 
ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

-- Add index for efficient filtering by origin
CREATE INDEX idx_trip_itinerary_activities_origin ON public.trip_itinerary_activities(origin);