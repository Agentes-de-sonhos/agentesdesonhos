
-- Table for hotel recommendations, removal requests, and new hotel suggestions
CREATE TABLE public.hotel_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'recommend', -- 'recommend', 'remove', 'suggest_new'
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  hotel_data JSONB, -- for suggest_new: contains hotel fields
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can create recommendations
CREATE POLICY "Users can create recommendations"
  ON public.hotel_recommendations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON public.hotel_recommendations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anyone authenticated can view approved recommendations
CREATE POLICY "Authenticated can view approved recommendations"
  ON public.hotel_recommendations FOR SELECT TO authenticated
  USING (status = 'approved' AND type = 'recommend');

-- Admins can manage all recommendations
CREATE POLICY "Admins can manage all recommendations"
  ON public.hotel_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can delete their own pending recommendations
CREATE POLICY "Users can delete own pending recommendations"
  ON public.hotel_recommendations FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');
