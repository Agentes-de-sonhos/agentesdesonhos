
-- Reviews for trade_suppliers (mirrors operator_reviews)
CREATE TABLE public.supplier_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.trade_suppliers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reaction text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, user_id)
);

ALTER TABLE public.supplier_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read supplier reviews"
  ON public.supplier_reviews FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can insert own supplier review"
  ON public.supplier_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplier review"
  ON public.supplier_reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any supplier review"
  ON public.supplier_reviews FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Moderation log for supplier reviews
CREATE TABLE public.supplier_review_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  rating smallint NOT NULL,
  reaction text,
  comment text,
  reason text,
  moderated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_review_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read supplier moderation logs"
  ON public.supplier_review_moderation_log FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert supplier moderation logs"
  ON public.supplier_review_moderation_log FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
