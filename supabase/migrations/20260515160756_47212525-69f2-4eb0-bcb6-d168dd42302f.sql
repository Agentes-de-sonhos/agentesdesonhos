-- 1. Add image_url + updated_at to support social feed
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.community_post_comments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_community_post_comments_updated_at ON public.community_post_comments;
CREATE TRIGGER trg_community_post_comments_updated_at
  BEFORE UPDATE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Loosen content NOT NULL so image-only posts are allowed
ALTER TABLE public.community_posts ALTER COLUMN content DROP NOT NULL;

-- 3. Open feed to all authenticated users (drop community-member gate)
DROP POLICY IF EXISTS "Members can read posts" ON public.community_posts;
DROP POLICY IF EXISTS "Members can insert posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can read posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON public.community_posts;

CREATE POLICY "Authenticated users can read posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own posts" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND ((content IS NOT NULL AND length(trim(content)) > 0) OR image_url IS NOT NULL)
  );

DROP POLICY IF EXISTS "Members can read comments" ON public.community_post_comments;
DROP POLICY IF EXISTS "Members can insert comments" ON public.community_post_comments;
DROP POLICY IF EXISTS "Authenticated users can read comments" ON public.community_post_comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.community_post_comments;

CREATE POLICY "Authenticated users can read comments" ON public.community_post_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.community_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND length(trim(content)) > 0);

DROP POLICY IF EXISTS "Members can read likes" ON public.community_post_likes;
DROP POLICY IF EXISTS "Members can insert likes" ON public.community_post_likes;
DROP POLICY IF EXISTS "Authenticated users can read likes" ON public.community_post_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.community_post_likes;

CREATE POLICY "Authenticated users can read likes" ON public.community_post_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own likes" ON public.community_post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-feed', 'community-feed', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Community feed images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to own community feed folder" ON storage.objects;
DROP POLICY IF EXISTS "Users update own community feed files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own community feed files" ON storage.objects;

CREATE POLICY "Community feed images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-feed');

CREATE POLICY "Users upload to own community feed folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-feed'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own community feed files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-feed' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own community feed files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-feed' AND auth.uid()::text = (storage.foldername(name))[1]);