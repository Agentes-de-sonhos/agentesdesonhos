
CREATE TABLE public.itinerary_period_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  period text NOT NULL CHECK (period IN ('manha','tarde','noite')),
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (itinerary_id, day_date, period)
);

ALTER TABLE public.itinerary_period_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their itinerary period images"
  ON public.itinerary_period_images FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Public can view published itinerary period images"
  ON public.itinerary_period_images FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.status = 'published'));

CREATE POLICY "Owners insert their itinerary period images"
  ON public.itinerary_period_images FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Owners update their itinerary period images"
  ON public.itinerary_period_images FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Owners delete their itinerary period images"
  ON public.itinerary_period_images FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.user_id = auth.uid()));

CREATE TRIGGER trg_itinerary_period_images_updated_at
  BEFORE UPDATE ON public.itinerary_period_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
