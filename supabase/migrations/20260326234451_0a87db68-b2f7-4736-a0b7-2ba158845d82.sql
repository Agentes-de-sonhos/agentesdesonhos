
CREATE TABLE public.flight_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number text NOT NULL,
  flight_date text,
  response_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flight_number, flight_date)
);

ALTER TABLE public.flight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.flight_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service insert" ON public.flight_cache
  FOR INSERT TO service_role WITH CHECK (true);
