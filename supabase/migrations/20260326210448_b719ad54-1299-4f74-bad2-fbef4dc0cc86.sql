
-- Create supplier_likes table for the like/recommendation system
CREATE TABLE public.supplier_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_source TEXT NOT NULL DEFAULT 'supplier',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, supplier_source, user_id)
);

-- Enable RLS
ALTER TABLE public.supplier_likes ENABLE ROW LEVEL SECURITY;

-- Users can read all likes (for counts)
CREATE POLICY "Anyone can read supplier likes"
  ON public.supplier_likes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes"
  ON public.supplier_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
  ON public.supplier_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
