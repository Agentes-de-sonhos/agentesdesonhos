-- Fase 3 Comunidade: visibilidade "minha rede", menções, compartilhamento e comentários ricos.

CREATE OR REPLACE FUNCTION public.are_users_connected(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = _a AND c.receiver_id = _b)
        OR (c.requester_id = _b AND c.receiver_id = _a))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_community_post(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = _post_id
      AND (
        p.visibility <> 'network'
        OR p.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.are_users_connected(auth.uid(), p.user_id)
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.are_users_connected(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_community_post(uuid) TO authenticated;

DROP POLICY IF EXISTS community_posts_write_guard ON public.community_posts;
CREATE POLICY community_posts_write_guard ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_team('community.post'::text)
  AND visibility = ANY (ARRAY['public'::text, 'internal'::text, 'network'::text])
  AND (
    (visibility = 'internal'::text AND agency_id IS NOT NULL AND agency_id = user_agency_id(auth.uid()) AND can_use_internal_community())
    OR (visibility = ANY (ARRAY['public'::text, 'network'::text])
        AND can_use_public_community()
        AND (agency_id IS NULL OR agency_id = user_agency_id(auth.uid())))
  )
);

DROP POLICY IF EXISTS community_posts_update_guard ON public.community_posts;
CREATE POLICY community_posts_update_guard ON public.community_posts
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND can_team('community.post'::text))
WITH CHECK (
  user_id = auth.uid()
  AND visibility = ANY (ARRAY['public'::text, 'internal'::text, 'network'::text])
  AND (agency_id IS NULL OR agency_id = user_agency_id(auth.uid()))
  AND (visibility <> 'internal'::text OR can_use_internal_community())
  AND (visibility = 'internal'::text OR can_use_public_community())
);

DROP POLICY IF EXISTS community_posts_network_restriction ON public.community_posts;
CREATE POLICY community_posts_network_restriction ON public.community_posts
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  visibility <> 'network'
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.are_users_connected(auth.uid(), user_id)
);

DROP POLICY IF EXISTS community_comments_post_visibility ON public.community_post_comments;
CREATE POLICY community_comments_post_visibility ON public.community_post_comments
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.can_view_community_post(post_id));

DROP POLICY IF EXISTS community_likes_post_visibility ON public.community_post_likes;
CREATE POLICY community_likes_post_visibility ON public.community_post_likes
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.can_view_community_post(post_id));

DROP POLICY IF EXISTS community_poll_votes_post_visibility ON public.community_post_poll_votes;
CREATE POLICY community_poll_votes_post_visibility ON public.community_post_poll_votes
AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.can_view_community_post(post_id));

ALTER TABLE public.community_post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS community_post_comments_parent_idx
  ON public.community_post_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS community_post_comments_post_created_idx
  ON public.community_post_comments (post_id, created_at);

CREATE OR REPLACE FUNCTION public.enforce_comment_single_level()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _parent_post uuid; _parent_parent uuid;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN RETURN NEW; END IF;
  SELECT post_id, parent_comment_id INTO _parent_post, _parent_parent
  FROM public.community_post_comments WHERE id = NEW.parent_comment_id;
  IF _parent_post IS NULL THEN
    RAISE EXCEPTION 'Comentário original não encontrado';
  END IF;
  IF _parent_post <> NEW.post_id THEN
    RAISE EXCEPTION 'A resposta deve pertencer à mesma publicação';
  END IF;
  IF _parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Respostas permitidas em apenas um nível';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_comment_single_level ON public.community_post_comments;
CREATE TRIGGER trg_enforce_comment_single_level
BEFORE INSERT OR UPDATE OF parent_comment_id ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_single_level();

CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_comment_likes TO authenticated;
GRANT ALL ON public.community_comment_likes TO service_role;
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_comment_likes_select ON public.community_comment_likes;
CREATE POLICY community_comment_likes_select ON public.community_comment_likes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.community_post_comments c
  WHERE c.id = comment_id AND public.can_view_community_post(c.post_id)
));

DROP POLICY IF EXISTS community_comment_likes_insert ON public.community_comment_likes;
CREATE POLICY community_comment_likes_insert ON public.community_comment_likes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.community_post_comments c
  WHERE c.id = comment_id AND public.can_view_community_post(c.post_id)
));

DROP POLICY IF EXISTS community_comment_likes_delete ON public.community_comment_likes;
CREATE POLICY community_comment_likes_delete ON public.community_comment_likes
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_post_comments
      SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_post_comments
      SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_comment_likes_count ON public.community_comment_likes;
CREATE TRIGGER trg_update_comment_likes_count
AFTER INSERT OR DELETE ON public.community_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TABLE IF NOT EXISTS public.community_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_dedupe_post_idx
  ON public.community_notifications (user_id, actor_id, type, post_id)
  WHERE comment_id IS NULL AND post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_dedupe_comment_idx
  ON public.community_notifications (user_id, actor_id, type, comment_id)
  WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_notifications_user_idx
  ON public.community_notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.community_notifications TO authenticated;
GRANT ALL ON public.community_notifications TO service_role;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_notifications_select_own ON public.community_notifications;
CREATE POLICY community_notifications_select_own ON public.community_notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_notifications_update_own ON public.community_notifications;
CREATE POLICY community_notifications_update_own ON public.community_notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.community_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_mentions_single_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL)
    OR (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT community_mentions_no_self CHECK (author_id <> mentioned_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS community_mentions_post_unique_idx
  ON public.community_mentions (post_id, mentioned_user_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_mentions_comment_unique_idx
  ON public.community_mentions (comment_id, mentioned_user_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_mentions_mentioned_idx
  ON public.community_mentions (mentioned_user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.community_mentions TO authenticated;
GRANT ALL ON public.community_mentions TO service_role;
ALTER TABLE public.community_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_mentions_select ON public.community_mentions;
CREATE POLICY community_mentions_select ON public.community_mentions
FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR mentioned_user_id = auth.uid()
  OR (post_id IS NOT NULL AND public.can_view_community_post(post_id))
  OR (comment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.community_post_comments c
    WHERE c.id = comment_id AND public.can_view_community_post(c.post_id)
  ))
);

DROP POLICY IF EXISTS community_mentions_insert ON public.community_mentions;
CREATE POLICY community_mentions_insert ON public.community_mentions
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.are_users_connected(auth.uid(), mentioned_user_id)
  AND (
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
    OR (comment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_post_comments c WHERE c.id = comment_id AND c.user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS community_mentions_delete_own ON public.community_mentions;
CREATE POLICY community_mentions_delete_own ON public.community_mentions
FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_mention_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT count(*) INTO _count FROM public.community_mentions WHERE post_id = NEW.post_id;
  ELSE
    SELECT count(*) INTO _count FROM public.community_mentions WHERE comment_id = NEW.comment_id;
  END IF;
  IF _count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 marcações por conteúdo';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_mention_limit ON public.community_mentions;
CREATE TRIGGER trg_enforce_mention_limit
BEFORE INSERT ON public.community_mentions
FOR EACH ROW EXECUTE FUNCTION public.enforce_mention_limit();

CREATE OR REPLACE FUNCTION public.notify_community_mention()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (NEW.mentioned_user_id, NEW.author_id, 'mention', NEW.post_id, NEW.comment_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_community_mention ON public.community_mentions;
CREATE TRIGGER trg_notify_community_mention
AFTER INSERT ON public.community_mentions
FOR EACH ROW EXECUTE FUNCTION public.notify_community_mention();

CREATE OR REPLACE FUNCTION public.share_community_post(
  _post_id uuid,
  _recipient_ids uuid[],
  _note text DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sender uuid := auth.uid();
  _recipient uuid;
  _conversation uuid;
  _sent integer := 0;
  _author uuid;
  _visibility text;
  _body text;
  _excerpt text;
BEGIN
  IF _sender IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _recipient_ids IS NULL OR array_length(_recipient_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione pelo menos uma conexão';
  END IF;
  IF array_length(_recipient_ids, 1) > 10 THEN
    RAISE EXCEPTION 'Envie para no máximo 10 conexões por vez';
  END IF;

  SELECT p.user_id, p.visibility, COALESCE(left(p.content, 140), '')
    INTO _author, _visibility, _excerpt
  FROM public.community_posts p WHERE p.id = _post_id;
  IF _author IS NULL THEN RAISE EXCEPTION 'Publicação não encontrada'; END IF;

  IF NOT (_visibility <> 'network' OR _author = _sender OR public.are_users_connected(_sender, _author)) THEN
    RAISE EXCEPTION 'Você não tem acesso a esta publicação';
  END IF;

  FOREACH _recipient IN ARRAY _recipient_ids LOOP
    IF _recipient = _sender THEN CONTINUE; END IF;
    IF NOT public.are_users_connected(_sender, _recipient) THEN
      RAISE EXCEPTION 'Só é possível enviar para conexões aceitas';
    END IF;
    IF _visibility = 'network'
       AND _recipient <> _author
       AND NOT public.are_users_connected(_recipient, _author) THEN
      CONTINUE;
    END IF;

    SELECT id INTO _conversation FROM public.direct_conversations
    WHERE (user_a = _sender AND user_b = _recipient) OR (user_a = _recipient AND user_b = _sender)
    LIMIT 1;

    IF _conversation IS NULL THEN
      INSERT INTO public.direct_conversations (user_a, user_b)
      VALUES (_sender, _recipient) RETURNING id INTO _conversation;
    END IF;

    _body := COALESCE(NULLIF(trim(_note), '') || E'\n', '')
      || 'Publicação da Comunidade' || CASE WHEN _excerpt <> '' THEN ': ' || _excerpt ELSE '' END
      || E'\n/comunidade?post=' || _post_id::text;

    INSERT INTO public.direct_messages (conversation_id, sender_id, content)
    VALUES (_conversation, _sender, _body);

    UPDATE public.direct_conversations SET last_message_at = now() WHERE id = _conversation;

    INSERT INTO public.community_notifications (user_id, actor_id, type, post_id)
    VALUES (_recipient, _sender, 'share', _post_id)
    ON CONFLICT DO NOTHING;

    _sent := _sent + 1;
  END LOOP;

  RETURN _sent;
END $$;

GRANT EXECUTE ON FUNCTION public.share_community_post(uuid, uuid[], text) TO authenticated;