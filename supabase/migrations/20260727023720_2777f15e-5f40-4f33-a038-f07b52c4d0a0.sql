
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS poll jsonb;

DROP POLICY IF EXISTS "Users can insert own posts" ON public.community_posts;
CREATE POLICY "Users can insert own posts" ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    (content IS NOT NULL AND length(trim(content)) > 0)
    OR image_url IS NOT NULL
    OR coalesce(array_length(image_urls, 1), 0) > 0
    OR video_url IS NOT NULL
    OR coalesce(jsonb_array_length(documents), 0) > 0
    OR poll IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.community_post_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_post_poll_votes TO authenticated;
GRANT ALL ON public.community_post_poll_votes TO service_role;

ALTER TABLE public.community_post_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poll votes readable by authenticated" ON public.community_post_poll_votes;
CREATE POLICY "Poll votes readable by authenticated" ON public.community_post_poll_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own poll vote" ON public.community_post_poll_votes;
CREATE POLICY "Users can insert own poll vote" ON public.community_post_poll_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own poll vote" ON public.community_post_poll_votes;
CREATE POLICY "Users can delete own poll vote" ON public.community_post_poll_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_community_post_poll_votes_post ON public.community_post_poll_votes(post_id);

CREATE OR REPLACE FUNCTION public.enforce_poll_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.poll IS DISTINCT FROM NEW.poll THEN
    IF EXISTS (SELECT 1 FROM public.community_post_poll_votes WHERE post_id = OLD.id) THEN
      RAISE EXCEPTION 'Não é possível alterar a enquete após haver votos.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_poll_immutability ON public.community_posts;
CREATE TRIGGER trg_enforce_poll_immutability
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_poll_immutability();
