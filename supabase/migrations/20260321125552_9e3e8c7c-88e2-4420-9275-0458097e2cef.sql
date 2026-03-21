
-- Community members table
CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'approved_unverified',
  entry_method TEXT NOT NULL,
  cnpj TEXT,
  years_experience INTEGER,
  bio TEXT,
  segments TEXT[],
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Community posts table
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Post likes table
CREATE TABLE public.community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- Post comments table
CREATE TABLE public.community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

-- Function to check community membership
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id
      AND status IN ('approved_unverified', 'verified')
  )
$$;

-- RLS: community_members
CREATE POLICY "Authenticated can read members"
  ON public.community_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own membership"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership"
  ON public.community_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update any membership"
  ON public.community_members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: community_posts
CREATE POLICY "Members can read posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Members can insert posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(auth.uid()));

CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users or admins can delete posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS: community_post_likes
CREATE POLICY "Members can read likes"
  ON public.community_post_likes FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Members can insert likes"
  ON public.community_post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(auth.uid()));

CREATE POLICY "Users can delete own likes"
  ON public.community_post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: community_post_comments
CREATE POLICY "Members can read comments"
  ON public.community_post_comments FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid()));

CREATE POLICY "Members can insert comments"
  ON public.community_post_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(auth.uid()));

CREATE POLICY "Users or admins can delete comments"
  ON public.community_post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Trigger: update post likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Trigger: update post comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_post_comment_change
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Updated_at triggers
CREATE TRIGGER update_community_members_updated_at
  BEFORE UPDATE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
