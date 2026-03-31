
-- Unified advisor reviews table for all Travel Advisor categories
CREATE TABLE public.advisor_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'attraction', 'experience', 'dining', 'shopping')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('recommend', 'not_recommend')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (item_id, item_type, user_id)
);

-- Indexes for performance
CREATE INDEX idx_advisor_reviews_item ON public.advisor_reviews (item_id, item_type);
CREATE INDEX idx_advisor_reviews_user ON public.advisor_reviews (user_id);
CREATE INDEX idx_advisor_reviews_type ON public.advisor_reviews (item_type, review_type);

-- Enable RLS
ALTER TABLE public.advisor_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
CREATE POLICY "Authenticated users can read advisor reviews"
  ON public.advisor_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert own advisor reviews"
  ON public.advisor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own advisor reviews"
  ON public.advisor_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own advisor reviews"
  ON public.advisor_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.advisor_reviews;
