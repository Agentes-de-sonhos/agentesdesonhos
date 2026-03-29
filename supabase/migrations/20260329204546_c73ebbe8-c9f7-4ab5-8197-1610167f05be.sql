
-- Add operator-style fields to companhias_maritimas
ALTER TABLE public.companhias_maritimas
  ADD COLUMN IF NOT EXISTS how_to_sell text,
  ADD COLUMN IF NOT EXISTS sales_channels text,
  ADD COLUMN IF NOT EXISTS commercial_contacts text,
  ADD COLUMN IF NOT EXISTS specialties text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Create cruise_reviews table (same pattern as operator_reviews)
CREATE TABLE public.cruise_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cruise_id uuid NOT NULL REFERENCES public.companhias_maritimas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reaction text CHECK (reaction IN ('recommend', 'not_recommend')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cruise_id, user_id)
);

CREATE INDEX idx_cruise_reviews_cruise_id ON public.cruise_reviews(cruise_id);
CREATE INDEX idx_cruise_reviews_user_id ON public.cruise_reviews(user_id);

ALTER TABLE public.cruise_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cruise reviews" ON public.cruise_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own cruise reviews" ON public.cruise_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cruise reviews" ON public.cruise_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cruise reviews" ON public.cruise_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any cruise review" ON public.cruise_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create cruise_review_moderation_log
CREATE TABLE public.cruise_review_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  cruise_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  rating smallint NOT NULL,
  reaction text,
  comment text,
  reason text,
  moderated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cruise_review_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage cruise moderation log" ON public.cruise_review_moderation_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert cruise moderation log" ON public.cruise_review_moderation_log FOR INSERT TO authenticated WITH CHECK (true);
