-- Fase 4 Comunidade: ocultar publicação por usuário, denúncias de post/comentário e moderação.

-- 1) Ocultar publicação apenas para o usuário (não exclui, não afeta os demais)
CREATE TABLE IF NOT EXISTS public.community_hidden_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS community_hidden_posts_user_idx
  ON public.community_hidden_posts (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.community_hidden_posts TO authenticated;
GRANT ALL ON public.community_hidden_posts TO service_role;
ALTER TABLE public.community_hidden_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_hidden_posts_select_own ON public.community_hidden_posts;
CREATE POLICY community_hidden_posts_select_own ON public.community_hidden_posts
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_hidden_posts_insert_own ON public.community_hidden_posts;
CREATE POLICY community_hidden_posts_insert_own ON public.community_hidden_posts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_view_community_post(post_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS community_hidden_posts_delete_own ON public.community_hidden_posts;
CREATE POLICY community_hidden_posts_delete_own ON public.community_hidden_posts
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2) Denúncias de publicação ou comentário (exatamente um alvo por registro)
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES public.community_post_comments(id) ON DELETE SET NULL,
  target_kind text NOT NULL,
  parent_post_id uuid,
  content_author_id uuid,
  content_snapshot text,
  reason text NOT NULL,
  details text,
  wants_updates boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolution text,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  review_started_at timestamptz,
  closed_at timestamptz,
  CONSTRAINT community_reports_target_kind_check CHECK (target_kind IN ('post', 'comment')),
  CONSTRAINT community_reports_single_target CHECK (
    (target_kind = 'post' AND comment_id IS NULL)
    OR (target_kind = 'comment' AND parent_post_id IS NOT NULL)
  ),
  CONSTRAINT community_reports_status_check CHECK (
    status IN ('pending', 'in_review', 'resolved_action', 'closed_no_action')
  ),
  CONSTRAINT community_reports_resolution_check CHECK (
    resolution IS NULL OR resolution IN ('content_removed', 'content_kept')
  ),
  CONSTRAINT community_reports_details_len CHECK (details IS NULL OR length(details) <= 500),
  CONSTRAINT community_reports_reason_check CHECK (reason IN (
    'harassment', 'fraud', 'spam', 'misinformation', 'hate_speech', 'threat',
    'self_harm', 'explicit_content', 'dangerous_organizations', 'sexual_content',
    'fake_account', 'child_exploitation', 'restricted_goods', 'non_consensual_intimate_images'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_active_post_idx
  ON public.community_reports (reporter_id, post_id)
  WHERE target_kind = 'post' AND status IN ('pending', 'in_review');
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_active_comment_idx
  ON public.community_reports (reporter_id, comment_id)
  WHERE target_kind = 'comment' AND status IN ('pending', 'in_review');
CREATE INDEX IF NOT EXISTS community_reports_status_idx
  ON public.community_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reports_reporter_idx
  ON public.community_reports (reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reports_reason_idx
  ON public.community_reports (reason, created_at DESC);

GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT UPDATE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- O usuário só cria denúncias em seu próprio nome, para conteúdo que consegue ver
DROP POLICY IF EXISTS community_reports_insert_own ON public.community_reports;
CREATE POLICY community_reports_insert_own ON public.community_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND status = 'pending'
  AND admin_notes IS NULL
  AND resolution IS NULL
  AND assigned_admin_id IS NULL
  AND (
    (target_kind = 'post' AND post_id IS NOT NULL AND public.can_view_community_post(post_id)
      AND NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
    OR (target_kind = 'comment' AND comment_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.community_post_comments c
        WHERE c.id = comment_id
          AND c.user_id <> auth.uid()
          AND public.can_view_community_post(c.post_id)))
  )
);

-- O usuário vê somente as próprias denúncias; administradores veem a fila completa
DROP POLICY IF EXISTS community_reports_select_own ON public.community_reports;
CREATE POLICY community_reports_select_own ON public.community_reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Somente administrador altera status/observações
DROP POLICY IF EXISTS community_reports_update_admin ON public.community_reports;
CREATE POLICY community_reports_update_admin ON public.community_reports
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Snapshot mínimo, validações e limite contra abuso
CREATE OR REPLACE FUNCTION public.prepare_community_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _recent integer;
  _author uuid;
  _content text;
  _post uuid;
BEGIN
  SELECT count(*) INTO _recent
  FROM public.community_reports
  WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '24 hours';
  IF _recent >= 20 THEN
    RAISE EXCEPTION 'Limite de denúncias atingido. Tente novamente mais tarde.';
  END IF;

  IF NEW.target_kind = 'post' THEN
    SELECT p.user_id, left(coalesce(p.content, ''), 2000)
      INTO _author, _content
    FROM public.community_posts p WHERE p.id = NEW.post_id;
    IF _author IS NULL THEN RAISE EXCEPTION 'Publicação não encontrada'; END IF;
    NEW.parent_post_id := NEW.post_id;
  ELSE
    SELECT c.user_id, left(coalesce(c.content, ''), 2000), c.post_id
      INTO _author, _content, _post
    FROM public.community_post_comments c WHERE c.id = NEW.comment_id;
    IF _author IS NULL THEN RAISE EXCEPTION 'Comentário não encontrado'; END IF;
    NEW.parent_post_id := _post;
    NEW.post_id := _post;
  END IF;

  IF _author = NEW.reporter_id THEN
    RAISE EXCEPTION 'Não é possível denunciar o próprio conteúdo';
  END IF;

  NEW.content_author_id := _author;
  NEW.content_snapshot := _content;
  NEW.status := 'pending';
  NEW.review_started_at := NULL;
  NEW.closed_at := NULL;
  IF NEW.details IS NOT NULL THEN
    NEW.details := nullif(btrim(left(NEW.details, 500)), '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prepare_community_report ON public.community_reports;
CREATE TRIGGER trg_prepare_community_report
BEFORE INSERT ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.prepare_community_report();

CREATE OR REPLACE FUNCTION public.enforce_community_report_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reporter_id <> OLD.reporter_id
     OR NEW.reason <> OLD.reason
     OR NEW.target_kind <> OLD.target_kind
     OR coalesce(NEW.comment_id::text, '') <> coalesce(OLD.comment_id::text, '')
     OR coalesce(NEW.parent_post_id::text, '') <> coalesce(OLD.parent_post_id::text, '')
     OR coalesce(NEW.content_author_id::text, '') <> coalesce(OLD.content_author_id::text, '')
     OR coalesce(NEW.details, '') <> coalesce(OLD.details, '')
     OR NEW.wants_updates <> OLD.wants_updates
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Dados originais da denúncia não podem ser alterados';
  END IF;

  -- Conteúdo removido depois: preserva a denúncia de forma auditável
  NEW.content_snapshot := OLD.content_snapshot;

  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('resolved_action', 'closed_no_action') THEN
      RAISE EXCEPTION 'Denúncia encerrada não pode mudar de status';
    END IF;
    IF OLD.status = 'pending' AND NEW.status NOT IN ('in_review', 'resolved_action', 'closed_no_action') THEN
      RAISE EXCEPTION 'Transição de status inválida';
    END IF;
    IF OLD.status = 'in_review' AND NEW.status NOT IN ('resolved_action', 'closed_no_action') THEN
      RAISE EXCEPTION 'Transição de status inválida';
    END IF;
    IF NEW.status = 'in_review' THEN
      NEW.review_started_at := coalesce(OLD.review_started_at, now());
      NEW.closed_at := NULL;
    ELSE
      NEW.closed_at := now();
    END IF;
    NEW.assigned_admin_id := coalesce(NEW.assigned_admin_id, auth.uid());
  END IF;

  IF NEW.status <> 'resolved_action' THEN
    NEW.resolution := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_community_report_update ON public.community_reports;
CREATE TRIGGER trg_enforce_community_report_update
BEFORE UPDATE ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_community_report_update();

-- 3) Notificações internas de status ao denunciante (somente se ele pediu)
ALTER TABLE public.community_notifications
  ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES public.community_reports(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS report_status text;

CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_dedupe_report_idx
  ON public.community_notifications (user_id, type, report_id, report_status)
  WHERE report_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_community_report_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status OR NOT NEW.wants_updates THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('in_review', 'resolved_action', 'closed_no_action') THEN RETURN NEW; END IF;
  INSERT INTO public.community_notifications (user_id, actor_id, type, post_id, report_id, report_status)
  VALUES (NEW.reporter_id, NULL, 'report_status', NULL, NEW.id, NEW.status)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_community_report_status ON public.community_reports;
CREATE TRIGGER trg_notify_community_report_status
AFTER UPDATE OF status ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_community_report_status();