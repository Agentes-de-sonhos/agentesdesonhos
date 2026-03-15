
CREATE TABLE public.air_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT,
  return_date DATE,
  return_time TEXT,
  airline TEXT NOT NULL,
  seats_available INTEGER,
  deadline DATE,
  block_code TEXT,
  price_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.air_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage air_blocks"
ON public.air_blocks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view air_blocks"
ON public.air_blocks FOR SELECT
TO authenticated
USING (true);
