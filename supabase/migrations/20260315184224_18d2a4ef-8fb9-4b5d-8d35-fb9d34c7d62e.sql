
-- Create operator reviews table
CREATE TABLE public.operator_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reaction text CHECK (reaction IN ('recommend', 'not_recommend')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, user_id)
);

-- Enable RLS
ALTER TABLE public.operator_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
CREATE POLICY "Authenticated users can read reviews"
  ON public.operator_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
  ON public.operator_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.operator_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.operator_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_operator_reviews_operator_id ON public.operator_reviews(operator_id);
CREATE INDEX idx_operator_reviews_user_id ON public.operator_reviews(user_id);
