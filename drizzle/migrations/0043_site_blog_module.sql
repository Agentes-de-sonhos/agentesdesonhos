-- Módulo opcional Site -> Blog (white-label). Aditivo; desligado por padrão (entitlement 'site_blog').

INSERT INTO public.team_permission_catalog (permission_key, module_key, label, is_sensitive)
VALUES ('site.blog.manage','site','Gerenciar o blog do site',false)
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.blog_can_manage(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND _agency_id IS NOT NULL
    AND _agency_id = COALESCE(public.current_agency_id(), auth.uid())
    AND public.can_team('site.blog.manage')
    AND public.agency_has_entitlement(_agency_id, 'site_blog')
$$;
REVOKE ALL ON FUNCTION public.blog_can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.blog_can_manage(uuid) TO authenticated, service_role;

-- Settings
CREATE TABLE public.site_blog_settings (
  agency_id uuid PRIMARY KEY,
  cta_title text,
  cta_text text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  default_author_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.site_blog_settings TO authenticated;
GRANT ALL ON public.site_blog_settings TO service_role;
ALTER TABLE public.site_blog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog settings manage" ON public.site_blog_settings FOR ALL TO authenticated
  USING (public.blog_can_manage(agency_id)) WITH CHECK (public.blog_can_manage(agency_id));

-- Categories
CREATE TABLE public.site_blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 70),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_blog_categories TO authenticated;
GRANT ALL ON public.site_blog_categories TO service_role;
ALTER TABLE public.site_blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog categories manage" ON public.site_blog_categories FOR ALL TO authenticated
  USING (public.blog_can_manage(agency_id)) WITH CHECK (public.blog_can_manage(agency_id));

-- Posts: rascunho de trabalho (draft) separado da versão publicada (published) e agendada (scheduled).
CREATE TABLE public.site_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','unpublished')),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_updated_at timestamptz NOT NULL DEFAULT now(),
  published jsonb,
  published_at timestamptz,
  published_updated_at timestamptz,
  scheduled jsonb,
  scheduled_at timestamptz,
  schedule_timezone text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, slug)
);
CREATE INDEX idx_site_blog_posts_agency_status ON public.site_blog_posts (agency_id, status);
CREATE INDEX idx_site_blog_posts_scheduled ON public.site_blog_posts (scheduled_at) WHERE status = 'scheduled';
GRANT SELECT, DELETE ON public.site_blog_posts TO authenticated;
GRANT INSERT (id, agency_id, slug, draft, created_by) ON public.site_blog_posts TO authenticated;
GRANT UPDATE (slug, draft, draft_updated_at) ON public.site_blog_posts TO authenticated;
GRANT ALL ON public.site_blog_posts TO service_role;
ALTER TABLE public.site_blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog posts manage" ON public.site_blog_posts FOR ALL TO authenticated
  USING (public.blog_can_manage(agency_id)) WITH CHECK (public.blog_can_manage(agency_id));

CREATE OR REPLACE FUNCTION public.site_blog_posts_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_cat text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.agency_id <> OLD.agency_id THEN RAISE EXCEPTION 'Agência não pode ser alterada.'; END IF;
    IF NEW.slug <> OLD.slug AND OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'O endereço de um artigo já publicado não pode ser alterado.';
    END IF;
  END IF;
  v_cat := NULLIF(NEW.draft->>'category_id','');
  IF v_cat IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.site_blog_categories c WHERE c.id::text = v_cat AND c.agency_id = NEW.agency_id
  ) THEN
    RAISE EXCEPTION 'Categoria inválida para esta agência.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_site_blog_posts_guard BEFORE INSERT OR UPDATE ON public.site_blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.site_blog_posts_guard();

-- Revisions
CREATE TABLE public.site_blog_post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.site_blog_posts(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  reason text NOT NULL DEFAULT 'autosave',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_blog_revisions_post ON public.site_blog_post_revisions (post_id, created_at DESC);
GRANT SELECT ON public.site_blog_post_revisions TO authenticated;
GRANT ALL ON public.site_blog_post_revisions TO service_role;
ALTER TABLE public.site_blog_post_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog revisions read" ON public.site_blog_post_revisions FOR SELECT TO authenticated
  USING (public.blog_can_manage(agency_id));

CREATE OR REPLACE FUNCTION public.site_blog_posts_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.draft IS DISTINCT FROM OLD.draft AND NOT EXISTS (
    SELECT 1 FROM public.site_blog_post_revisions r
    WHERE r.post_id = NEW.id AND r.reason = 'autosave' AND r.created_at > now() - interval '10 minutes'
  ) THEN
    INSERT INTO public.site_blog_post_revisions (post_id, agency_id, snapshot, reason, created_by)
    VALUES (NEW.id, NEW.agency_id, OLD.draft, 'autosave', auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_site_blog_posts_revision AFTER UPDATE OF draft ON public.site_blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.site_blog_posts_revision();

-- Publish log
CREATE TABLE public.site_blog_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid,
  agency_id uuid,
  action text NOT NULL,
  ok boolean NOT NULL,
  message text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_blog_publish_log TO authenticated;
GRANT ALL ON public.site_blog_publish_log TO service_role;
ALTER TABLE public.site_blog_publish_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog log read" ON public.site_blog_publish_log FOR SELECT TO authenticated
  USING (public.blog_can_manage(agency_id));

-- Ações editoriais (únicas vias para mudar status/versão publicada)
CREATE OR REPLACE FUNCTION public.blog_validate_snapshot(_s jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN length(btrim(COALESCE(_s->>'title',''))) < 3 THEN 'Informe um título com pelo menos 3 caracteres.'
              WHEN _s->'content' IS NULL OR jsonb_typeof(_s->'content') <> 'object' THEN 'O artigo está sem conteúdo.'
              ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.blog_post_action(p_post_id uuid, p_action text, p_at timestamptz DEFAULT NULL, p_timezone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.site_blog_posts; v_err text;
BEGIN
  SELECT * INTO p FROM public.site_blog_posts WHERE id = p_post_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.blog_can_manage(p.agency_id) THEN
    RETURN jsonb_build_object('error','Artigo não encontrado ou sem permissão.');
  END IF;

  IF p_action = 'publish' THEN
    v_err := public.blog_validate_snapshot(p.draft);
    IF v_err IS NOT NULL THEN RETURN jsonb_build_object('error', v_err); END IF;
    UPDATE public.site_blog_posts SET status='published', published=p.draft,
      published_at=COALESCE(published_at, now()), published_updated_at=now(),
      scheduled=NULL, scheduled_at=NULL, schedule_timezone=NULL WHERE id=p.id;
    INSERT INTO public.site_blog_post_revisions (post_id, agency_id, snapshot, reason, created_by)
      VALUES (p.id, p.agency_id, p.draft, 'publicação', auth.uid());
  ELSIF p_action = 'schedule' THEN
    IF p.status = 'published' THEN RETURN jsonb_build_object('error','Este artigo já está no ar. Use "Publicar alterações".'); END IF;
    IF p_at IS NULL OR p_at <= now() + interval '1 minute' THEN RETURN jsonb_build_object('error','Escolha uma data e hora no futuro.'); END IF;
    IF p_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
      RETURN jsonb_build_object('error','Fuso horário inválido.');
    END IF;
    v_err := public.blog_validate_snapshot(p.draft);
    IF v_err IS NOT NULL THEN RETURN jsonb_build_object('error', v_err); END IF;
    UPDATE public.site_blog_posts SET status='scheduled', scheduled=p.draft, scheduled_at=p_at, schedule_timezone=p_timezone WHERE id=p.id;
  ELSIF p_action = 'cancel_schedule' THEN
    IF p.status <> 'scheduled' THEN RETURN jsonb_build_object('error','Este artigo não está agendado.'); END IF;
    UPDATE public.site_blog_posts SET status = CASE WHEN published IS NOT NULL THEN 'unpublished' ELSE 'draft' END,
      scheduled=NULL, scheduled_at=NULL, schedule_timezone=NULL WHERE id=p.id;
  ELSIF p_action = 'unpublish' THEN
    IF p.status NOT IN ('published','scheduled') THEN RETURN jsonb_build_object('error','Este artigo não está no ar.'); END IF;
    UPDATE public.site_blog_posts SET status = CASE WHEN published IS NOT NULL OR p.status='published' THEN 'unpublished' ELSE 'draft' END,
      scheduled=NULL, scheduled_at=NULL, schedule_timezone=NULL WHERE id=p.id;
  ELSE
    RETURN jsonb_build_object('error','Ação inválida.');
  END IF;

  INSERT INTO public.site_blog_publish_log (post_id, agency_id, action, ok, actor) VALUES (p.id, p.agency_id, p_action, true, auth.uid());
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.blog_post_action(uuid,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.blog_post_action(uuid,text,timestamptz,text) TO authenticated;

-- Restaurar versão: só reescreve o rascunho; nunca publica.
CREATE OR REPLACE FUNCTION public.blog_restore_revision(p_revision_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.site_blog_post_revisions;
BEGIN
  SELECT * INTO r FROM public.site_blog_post_revisions WHERE id = p_revision_id;
  IF r.id IS NULL OR NOT public.blog_can_manage(r.agency_id) THEN
    RETURN jsonb_build_object('error','Versão não encontrada.');
  END IF;
  UPDATE public.site_blog_posts SET draft = r.snapshot, draft_updated_at = now() WHERE id = r.post_id AND agency_id = r.agency_id;
  RETURN jsonb_build_object('ok', true, 'draft', r.snapshot);
END $$;
REVOKE ALL ON FUNCTION public.blog_restore_revision(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.blog_restore_revision(uuid) TO authenticated;

-- Agendamento: a leitura pública já considera "agendado e vencido" como publicado
-- (não depende de página aberta). Este job só consolida o status, é idempotente e registra falhas.
CREATE OR REPLACE FUNCTION public.blog_run_scheduled()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.site_blog_posts; n integer := 0;
BEGIN
  FOR p IN SELECT * FROM public.site_blog_posts
           WHERE status='scheduled' AND scheduled_at <= now()
           ORDER BY scheduled_at LIMIT 200 FOR UPDATE SKIP LOCKED LOOP
    BEGIN
      IF NOT public.agency_has_entitlement(p.agency_id, 'site_blog') THEN
        INSERT INTO public.site_blog_publish_log (post_id, agency_id, action, ok, message)
        SELECT p.id, p.agency_id, 'scheduled_publish', false, 'Recurso Blog desligado para a agência.'
        WHERE NOT EXISTS (SELECT 1 FROM public.site_blog_publish_log l WHERE l.post_id=p.id AND l.action='scheduled_publish' AND NOT l.ok AND l.created_at > now() - interval '1 day');
        CONTINUE;
      END IF;
      UPDATE public.site_blog_posts SET status='published', published=p.scheduled,
        published_at=COALESCE(published_at, p.scheduled_at), published_updated_at=p.scheduled_at,
        scheduled=NULL, scheduled_at=NULL, schedule_timezone=NULL
      WHERE id=p.id AND status='scheduled';
      INSERT INTO public.site_blog_publish_log (post_id, agency_id, action, ok) VALUES (p.id, p.agency_id, 'scheduled_publish', true);
      n := n + 1;
    EXCEPTION WHEN others THEN
      INSERT INTO public.site_blog_publish_log (post_id, agency_id, action, ok, message) VALUES (p.id, p.agency_id, 'scheduled_publish', false, left(SQLERRM, 500));
    END;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.blog_run_scheduled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_run_scheduled() TO service_role;

-- Leitura pública (somente versão publicada/agendada vencida, agência habilitada, domínio ativo)
CREATE OR REPLACE FUNCTION public.blog_public_agency(p_hostname text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.user_id FROM public.agency_public_domains d
  WHERE d.is_active AND d.hostname = lower(btrim(p_hostname))
    AND public.agency_has_entitlement(d.user_id, 'site_blog')
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.blog_public_agency(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_public_agency(text) TO service_role;

CREATE OR REPLACE FUNCTION public.blog_public_posts(p_hostname text)
RETURNS TABLE (id uuid, slug text, content jsonb, published_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.slug,
    CASE WHEN p.status='published' THEN p.published ELSE p.scheduled END,
    CASE WHEN p.status='published' THEN p.published_at ELSE COALESCE(p.published_at, p.scheduled_at) END,
    CASE WHEN p.status='published' THEN p.published_updated_at ELSE p.scheduled_at END
  FROM public.site_blog_posts p
  WHERE p.agency_id = public.blog_public_agency(p_hostname)
    AND (p.status='published' OR (p.status='scheduled' AND p.scheduled_at <= now()))
$$;
REVOKE ALL ON FUNCTION public.blog_public_posts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_public_posts(text) TO service_role;

CREATE OR REPLACE FUNCTION public.blog_public_categories(p_hostname text)
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.slug FROM public.site_blog_categories c
  WHERE c.agency_id = public.blog_public_agency(p_hostname) ORDER BY c.name
$$;
REVOKE ALL ON FUNCTION public.blog_public_categories(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_public_categories(text) TO service_role;

CREATE OR REPLACE FUNCTION public.blog_public_settings(p_hostname text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(s) - 'agency_id' FROM public.site_blog_settings s WHERE s.agency_id = public.blog_public_agency(p_hostname)
$$;
REVOKE ALL ON FUNCTION public.blog_public_settings(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_public_settings(text) TO service_role;

-- Leads: origem "blog" na Central de Solicitações existente
ALTER TABLE public.agency_site_requests DROP CONSTRAINT IF EXISTS agency_site_requests_service_key_check;
ALTER TABLE public.agency_site_requests ADD CONSTRAINT agency_site_requests_service_key_check
  CHECK (service_key = ANY (ARRAY['aereo','hospedagem','carro','transfer','ingressos','seguro','cruzeiros','pacotes','inspiracoes','oferta','blog']));

CREATE OR REPLACE FUNCTION public.agency_request_service_label(p_key text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE lower(btrim(coalesce(p_key, '')))
    WHEN 'aereo' THEN 'Aéreo'
    WHEN 'hospedagem' THEN 'Hospedagem'
    WHEN 'carro' THEN 'Aluguel de Carro'
    WHEN 'transfer' THEN 'Transfer'
    WHEN 'ingressos' THEN 'Ingressos e Atrações'
    WHEN 'seguro' THEN 'Seguro Viagem'
    WHEN 'cruzeiros' THEN 'Cruzeiros'
    WHEN 'pacotes' THEN 'Pacotes e Circuitos'
    WHEN 'inspiracoes' THEN 'Inspirações'
    WHEN 'blog' THEN 'Blog'
    ELSE NULLIF(btrim(coalesce(p_key, '')), '')
  END
$function$;
