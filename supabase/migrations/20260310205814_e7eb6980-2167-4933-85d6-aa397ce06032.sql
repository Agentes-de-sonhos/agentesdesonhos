
CREATE TABLE public.page_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  banner_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.page_banners ENABLE ROW LEVEL SECURITY;

-- Everyone can read banners
CREATE POLICY "Anyone can read page banners"
  ON public.page_banners
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage banners
CREATE POLICY "Admins can manage page banners"
  ON public.page_banners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
