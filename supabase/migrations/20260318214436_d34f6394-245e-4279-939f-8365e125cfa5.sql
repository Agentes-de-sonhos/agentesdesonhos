
-- Table for news likes (one per user per news)
CREATE TABLE public.news_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  noticia_id uuid NOT NULL REFERENCES public.noticias_dashboard(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(noticia_id, user_id)
);

-- Enable RLS
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see all likes (for counts)
CREATE POLICY "Anyone can view likes" ON public.news_likes
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like" ON public.news_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can unlike" ON public.news_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Index for fast count queries
CREATE INDEX idx_news_likes_noticia ON public.news_likes(noticia_id);
