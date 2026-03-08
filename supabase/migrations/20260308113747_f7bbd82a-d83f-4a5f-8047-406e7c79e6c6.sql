
-- Agency showcases (one per user/agency)
CREATE TABLE public.agency_showcases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Showcase items
CREATE TABLE public.showcase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.agency_showcases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Geral',
  subcategory TEXT,
  action_type TEXT NOT NULL DEFAULT 'whatsapp',
  action_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Showcase statistics
CREATE TABLE public.showcase_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.agency_showcases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  item_id UUID REFERENCES public.showcase_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_showcase_slug ON public.agency_showcases(slug);
CREATE INDEX idx_showcase_items_showcase ON public.showcase_items(showcase_id);
CREATE INDEX idx_showcase_stats_showcase ON public.showcase_stats(showcase_id);

-- RLS
ALTER TABLE public.agency_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_stats ENABLE ROW LEVEL SECURITY;

-- Showcase: owner can CRUD, public can read active
CREATE POLICY "Users manage own showcase" ON public.agency_showcases
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read active showcases" ON public.agency_showcases
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Authenticated read active showcases" ON public.agency_showcases
  FOR SELECT TO authenticated USING (is_active = true);

-- Items: owner can CRUD, public can read active non-expired
CREATE POLICY "Users manage own items" ON public.showcase_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read active items" ON public.showcase_items
  FOR SELECT TO anon USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Authenticated read active items" ON public.showcase_items
  FOR SELECT TO authenticated USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
  );

-- Stats: anyone can insert, admins can read
CREATE POLICY "Anyone can insert stats" ON public.showcase_stats
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read stats" ON public.showcase_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for showcase uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('showcase-images', 'showcase-images', true);

CREATE POLICY "Users upload showcase images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'showcase-images');

CREATE POLICY "Public read showcase images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'showcase-images');

CREATE POLICY "Users delete own showcase images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'showcase-images' AND (storage.foldername(name))[1] = auth.uid()::text);
