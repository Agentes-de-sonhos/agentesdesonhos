
-- Table to store flight status updates
CREATE TABLE public.flight_status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_service_id UUID REFERENCES public.trip_services(id) ON DELETE CASCADE NOT NULL,
  flight_number TEXT NOT NULL,
  flight_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  status_label TEXT NOT NULL DEFAULT 'Confirmado',
  departure_scheduled TEXT,
  departure_actual TEXT,
  arrival_scheduled TEXT,
  arrival_actual TEXT,
  terminal TEXT,
  gate TEXT,
  delay_minutes INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_service_id, flight_number, flight_date)
);

ALTER TABLE public.flight_status_updates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own flight status updates
CREATE POLICY "Users can view their flight status updates"
  ON public.flight_status_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_services ts
      JOIN public.trips t ON t.id = ts.trip_id
      WHERE ts.id = flight_status_updates.trip_service_id
      AND t.user_id = auth.uid()
    )
  );

-- Allow anon users to read for shared trips
CREATE POLICY "Anon can view flight status for shared trips"
  ON public.flight_status_updates
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_services ts
      JOIN public.trips t ON t.id = ts.trip_id
      WHERE ts.id = flight_status_updates.trip_service_id
      AND t.share_token IS NOT NULL
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.flight_status_updates;
