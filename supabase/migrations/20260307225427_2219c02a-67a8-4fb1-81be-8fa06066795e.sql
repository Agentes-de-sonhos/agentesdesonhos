
-- Dining Advisor table
CREATE TABLE public.dining_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  neighborhood TEXT,
  cuisine_type TEXT,
  price_range TEXT,
  short_description TEXT,
  full_description TEXT,
  address TEXT,
  google_maps_link TEXT,
  website TEXT,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  expert_tip TEXT,
  has_view BOOLEAN NOT NULL DEFAULT false,
  michelin BOOLEAN NOT NULL DEFAULT false,
  rooftop BOOLEAN NOT NULL DEFAULT false,
  local_favorite BOOLEAN NOT NULL DEFAULT false,
  must_visit BOOLEAN NOT NULL DEFAULT false,
  review_score NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attraction Advisor table
CREATE TABLE public.attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  neighborhood TEXT,
  category TEXT,
  short_description TEXT,
  full_description TEXT,
  average_visit_time TEXT,
  address TEXT,
  google_maps_link TEXT,
  website TEXT,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  expert_tip TEXT,
  must_visit BOOLEAN NOT NULL DEFAULT false,
  review_score NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shopping Advisor table
CREATE TABLE public.shopping_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  neighborhood TEXT,
  shopping_type TEXT,
  price_range TEXT,
  short_description TEXT,
  full_description TEXT,
  address TEXT,
  google_maps_link TEXT,
  website TEXT,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  expert_tip TEXT,
  is_outlet BOOLEAN NOT NULL DEFAULT false,
  must_visit BOOLEAN NOT NULL DEFAULT false,
  review_score NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Experience Advisor table
CREATE TABLE public.experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  neighborhood TEXT,
  category TEXT,
  average_duration TEXT,
  short_description TEXT,
  full_description TEXT,
  average_price NUMERIC,
  booking_url TEXT,
  address TEXT,
  google_maps_link TEXT,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  expert_tip TEXT,
  must_visit BOOLEAN NOT NULL DEFAULT false,
  review_score NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dining_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY "Authenticated users can read dining_places" ON public.dining_places FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read attractions" ON public.attractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read shopping_places" ON public.shopping_places FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read experiences" ON public.experiences FOR SELECT TO authenticated USING (true);

-- Admin write policies
CREATE POLICY "Admins can manage dining_places" ON public.dining_places FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage attractions" ON public.attractions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage shopping_places" ON public.shopping_places FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage experiences" ON public.experiences FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
