
-- Business Cards table
CREATE TABLE public.business_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  title text DEFAULT '',
  agency_name text DEFAULT '',
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  photo_url text,
  cover_url text,
  primary_color text DEFAULT '#0284c7',
  secondary_color text DEFAULT '#f97316',
  logos jsonb DEFAULT '[]'::jsonb,
  buttons jsonb DEFAULT '[]'::jsonb,
  social_links jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;

-- Authenticated users manage their own card
CREATE POLICY "Users manage own business card"
  ON public.business_cards FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public read access for active cards
CREATE POLICY "Public view active business cards"
  ON public.business_cards FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Auth view active business cards"
  ON public.business_cards FOR SELECT TO authenticated
  USING (is_active = true);

-- Stats table for future analytics
CREATE TABLE public.business_card_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.business_cards(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.business_card_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert card stats"
  ON public.business_card_stats FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read card stats"
  ON public.business_card_stats FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
