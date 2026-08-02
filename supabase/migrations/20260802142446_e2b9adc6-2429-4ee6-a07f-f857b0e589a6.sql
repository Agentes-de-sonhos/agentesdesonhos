-- ============ Curation table ============
CREATE TABLE IF NOT EXISTS public.news_curation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curation_type text NOT NULL CHECK (curation_type IN ('daily','weekly','top5')),
  period_start date NOT NULL,
  position integer NULL CHECK (position IS NULL OR (position BETWEEN 1 AND 5)),
  noticia_id uuid NOT NULL REFERENCES public.noticias_dashboard(id) ON DELETE CASCADE,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_curation_position_shape CHECK (
    (curation_type = 'top5' AND position IS NOT NULL)
    OR (curation_type <> 'top5' AND position IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS news_curation_single_featured_idx
  ON public.news_curation (curation_type, period_start)
  WHERE position IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS news_curation_position_idx
  ON public.news_curation (curation_type, period_start, position)
  WHERE position IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS news_curation_unique_news_idx
  ON public.news_curation (curation_type, period_start, noticia_id);

CREATE INDEX IF NOT EXISTS news_curation_lookup_idx
  ON public.news_curation (curation_type, period_start);

GRANT SELECT ON public.news_curation TO authenticated;
GRANT ALL ON public.news_curation TO service_role;
ALTER TABLE public.news_curation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_curation_select_auth" ON public.news_curation;
CREATE POLICY "news_curation_select_auth" ON public.news_curation
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "news_curation_admin_all" ON public.news_curation;
CREATE POLICY "news_curation_admin_all" ON public.news_curation
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Audit table ============
CREATE TABLE IF NOT EXISTS public.news_curation_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NULL,
  action text NOT NULL,
  curation_type text NULL,
  period_start date NULL,
  position integer NULL,
  before_data jsonb NULL,
  after_data jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.news_curation_audit TO authenticated;
GRANT ALL ON public.news_curation_audit TO service_role;
ALTER TABLE public.news_curation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_curation_audit_admin_read" ON public.news_curation_audit;
CREATE POLICY "news_curation_audit_admin_read" ON public.news_curation_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Timezone helpers ============
CREATE OR REPLACE FUNCTION public.news_today_sp()
RETURNS date LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

CREATE OR REPLACE FUNCTION public.news_week_start_sp(p_ref date DEFAULT NULL)
RETURNS date LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT (date_trunc('week', COALESCE(p_ref, (now() AT TIME ZONE 'America/Sao_Paulo')::date)::timestamp))::date;
$$;

-- ============ Highlights (featured + top5) ============
CREATE OR REPLACE FUNCTION public.news_highlights()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := public.news_today_sp();
  v_dow int := EXTRACT(isodow FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_mode text;
  v_week_start date := public.news_week_start_sp();
  v_period_start date;
  v_feat_start timestamptz;
  v_week_ts timestamptz;
  v_manual_id uuid;
  v_featured json;
  v_top5 json;
BEGIN
  v_mode := CASE WHEN v_dow >= 6 THEN 'weekly' ELSE 'daily' END;
  v_period_start := CASE WHEN v_mode = 'weekly' THEN v_week_start ELSE v_today END;
  v_feat_start := (v_period_start::timestamp) AT TIME ZONE 'America/Sao_Paulo';
  v_week_ts := (v_week_start::timestamp) AT TIME ZONE 'America/Sao_Paulo';

  SELECT c.noticia_id INTO v_manual_id
  FROM public.news_curation c
  JOIN public.noticias_dashboard nd ON nd.id = c.noticia_id
  WHERE c.curation_type = v_mode
    AND c.period_start = v_period_start
    AND nd.status = 'aprovado'
    AND nd.hidden = false
  LIMIT 1;

  -- featured
  SELECT to_json(x) INTO v_featured FROM (
    SELECT nd.id, nd.titulo_curto, nd.resumo, nd.categoria, nd.fonte, nd.url_original,
           nd.data_publicacao, nd.reads_count, nd.likes_count,
           (SELECT count(*)::int FROM public.news_reads nr WHERE nr.noticia_id = nd.id AND nr.read_at >= v_feat_start) AS window_reads,
           (SELECT count(*)::int FROM public.news_likes nl WHERE nl.noticia_id = nd.id AND nl.created_at >= v_feat_start) AS window_likes,
           (SELECT count(*)::int FROM public.news_reads nr WHERE nr.noticia_id = nd.id AND nr.read_at >= v_feat_start)
             + 2 * (SELECT count(*)::int FROM public.news_likes nl WHERE nl.noticia_id = nd.id AND nl.created_at >= v_feat_start) AS score,
           (v_manual_id IS NOT NULL) AS is_manual
    FROM public.noticias_dashboard nd
    WHERE nd.status = 'aprovado' AND nd.hidden = false
      AND (
        (v_manual_id IS NOT NULL AND nd.id = v_manual_id)
        OR (v_manual_id IS NULL AND nd.data_publicacao >= v_feat_start)
      )
    ORDER BY
      ((SELECT count(*)::int FROM public.news_reads nr WHERE nr.noticia_id = nd.id AND nr.read_at >= v_feat_start)
        + 2 * (SELECT count(*)::int FROM public.news_likes nl WHERE nl.noticia_id = nd.id AND nl.created_at >= v_feat_start)) DESC,
      nd.data_publicacao DESC, nd.id
    LIMIT 1
  ) x;

  -- top5 (always weekly window: monday 00:00 SP -> now)
  WITH metrics AS (
    SELECT nd.id, nd.titulo_curto, nd.resumo, nd.categoria, nd.fonte, nd.url_original,
           nd.data_publicacao, nd.reads_count, nd.likes_count, nd.status, nd.hidden,
           COALESCE(r.c, 0) AS window_reads,
           COALESCE(l.c, 0) AS window_likes,
           COALESCE(r.c, 0) + COALESCE(l.c, 0) * 2 AS score
    FROM public.noticias_dashboard nd
    LEFT JOIN (
      SELECT noticia_id, count(*)::int AS c FROM public.news_reads WHERE read_at >= v_week_ts GROUP BY 1
    ) r ON r.noticia_id = nd.id
    LEFT JOIN (
      SELECT noticia_id, count(*)::int AS c FROM public.news_likes WHERE created_at >= v_week_ts GROUP BY 1
    ) l ON l.noticia_id = nd.id
    WHERE nd.status = 'aprovado' AND nd.hidden = false
  ),
  manual AS (
    SELECT c.position, c.noticia_id
    FROM public.news_curation c
    JOIN metrics m ON m.id = c.noticia_id
    WHERE c.curation_type = 'top5' AND c.period_start = v_week_start AND c.position IS NOT NULL
  ),
  auto_ranked AS (
    SELECT m.*, ROW_NUMBER() OVER (
      ORDER BY m.score DESC, m.window_likes DESC, m.window_reads DESC, m.data_publicacao DESC, m.id
    ) AS rn
    FROM metrics m
    WHERE m.data_publicacao >= v_week_ts
      AND NOT EXISTS (SELECT 1 FROM manual mm WHERE mm.noticia_id = m.id)
  ),
  free_slots AS (
    SELECT p, ROW_NUMBER() OVER (ORDER BY p) AS rn
    FROM generate_series(1, 5) AS p
    WHERE NOT EXISTS (SELECT 1 FROM manual mm WHERE mm.position = p)
  ),
  combined AS (
    SELECT mm.position, m.*, true AS is_manual
    FROM manual mm JOIN metrics m ON m.id = mm.noticia_id
    UNION ALL
    SELECT f.p AS position, a.id, a.titulo_curto, a.resumo, a.categoria, a.fonte, a.url_original,
           a.data_publicacao, a.reads_count, a.likes_count, a.status, a.hidden,
           a.window_reads, a.window_likes, a.score, false AS is_manual
    FROM free_slots f JOIN auto_ranked a ON a.rn = f.rn
  )
  SELECT COALESCE(json_agg(row_to_json(y) ORDER BY y.position), '[]'::json) INTO v_top5
  FROM (
    SELECT c.position, c.id, c.titulo_curto, c.resumo, c.categoria, c.fonte, c.url_original,
           c.data_publicacao, c.reads_count, c.likes_count, c.window_reads, c.window_likes,
           c.score, c.is_manual
    FROM combined c
  ) y;

  RETURN json_build_object(
    'mode', v_mode,
    'period_start', v_period_start,
    'week_start', v_week_start,
    'today', v_today,
    'featured', v_featured,
    'top5', COALESCE(v_top5, '[]'::json)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.news_highlights() TO authenticated;

-- ============ Admin curation management ============
CREATE OR REPLACE FUNCTION public.admin_news_curation_list()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start date := public.news_week_start_sp();
  v_today date := public.news_today_sp();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN json_build_object(
    'today', v_today,
    'week_start', v_week_start,
    'items', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x.curation_type, x.position NULLS FIRST)
      FROM (
        SELECT c.id, c.curation_type, c.period_start, c.position, c.noticia_id,
               nd.titulo_curto, nd.fonte, nd.categoria, nd.data_publicacao,
               nd.reads_count, nd.likes_count
        FROM public.news_curation c
        JOIN public.noticias_dashboard nd ON nd.id = c.noticia_id
        WHERE (c.curation_type = 'daily' AND c.period_start = v_today)
           OR (c.curation_type IN ('weekly','top5') AND c.period_start = v_week_start)
      ) x
    ), '[]'::json)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_news_curation_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_news_curation(
  p_curation_type text,
  p_noticia_id uuid,
  p_position integer DEFAULT NULL,
  p_period_start date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_period date;
  v_before jsonb;
  v_row public.news_curation;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_curation_type NOT IN ('daily','weekly','top5') THEN
    RAISE EXCEPTION 'invalid curation_type';
  END IF;
  IF p_curation_type = 'top5' AND (p_position IS NULL OR p_position < 1 OR p_position > 5) THEN
    RAISE EXCEPTION 'position must be between 1 and 5';
  END IF;
  IF p_curation_type <> 'top5' AND p_position IS NOT NULL THEN
    RAISE EXCEPTION 'position only applies to top5';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.noticias_dashboard WHERE id = p_noticia_id) THEN
    RAISE EXCEPTION 'news not found';
  END IF;

  v_period := COALESCE(
    p_period_start,
    CASE WHEN p_curation_type = 'daily' THEN public.news_today_sp() ELSE public.news_week_start_sp() END
  );

  SELECT jsonb_agg(to_jsonb(c)) INTO v_before
  FROM public.news_curation c
  WHERE c.curation_type = p_curation_type AND c.period_start = v_period;

  -- a news item cannot occupy two positions within the same type/period
  DELETE FROM public.news_curation
  WHERE curation_type = p_curation_type AND period_start = v_period AND noticia_id = p_noticia_id;

  IF p_curation_type = 'top5' THEN
    DELETE FROM public.news_curation
    WHERE curation_type = 'top5' AND period_start = v_period AND position = p_position;
  ELSE
    DELETE FROM public.news_curation
    WHERE curation_type = p_curation_type AND period_start = v_period;
  END IF;

  INSERT INTO public.news_curation (curation_type, period_start, position, noticia_id, created_by)
  VALUES (p_curation_type, v_period, p_position, p_noticia_id, v_admin)
  RETURNING * INTO v_row;

  INSERT INTO public.news_curation_audit (admin_id, action, curation_type, period_start, position, before_data, after_data)
  VALUES (v_admin, 'set', p_curation_type, v_period, p_position, v_before, to_jsonb(v_row));

  RETURN to_json(v_row);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_news_curation(text, uuid, integer, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_news_curation(
  p_curation_type text,
  p_position integer DEFAULT NULL,
  p_period_start date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_period date;
  v_before jsonb;
  v_deleted int;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_curation_type NOT IN ('daily','weekly','top5') THEN
    RAISE EXCEPTION 'invalid curation_type';
  END IF;

  v_period := COALESCE(
    p_period_start,
    CASE WHEN p_curation_type = 'daily' THEN public.news_today_sp() ELSE public.news_week_start_sp() END
  );

  SELECT jsonb_agg(to_jsonb(c)) INTO v_before
  FROM public.news_curation c
  WHERE c.curation_type = p_curation_type AND c.period_start = v_period
    AND (p_position IS NULL OR c.position = p_position);

  DELETE FROM public.news_curation
  WHERE curation_type = p_curation_type AND period_start = v_period
    AND (p_position IS NULL OR position = p_position);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.news_curation_audit (admin_id, action, curation_type, period_start, position, before_data, after_data)
  VALUES (v_admin, 'remove', p_curation_type, v_period, p_position, v_before, NULL);

  RETURN json_build_object('removed', v_deleted);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_remove_news_curation(text, integer, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_news_curation(p_period_start date DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_week date;
  v_today date := public.news_today_sp();
  v_before jsonb;
  v_deleted int;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_week := COALESCE(p_period_start, public.news_week_start_sp());

  SELECT jsonb_agg(to_jsonb(c)) INTO v_before
  FROM public.news_curation c
  WHERE (c.curation_type IN ('weekly','top5') AND c.period_start = v_week)
     OR (c.curation_type = 'daily' AND c.period_start >= v_week AND c.period_start < v_week + 7);

  DELETE FROM public.news_curation
  WHERE (curation_type IN ('weekly','top5') AND period_start = v_week)
     OR (curation_type = 'daily' AND period_start >= v_week AND period_start < v_week + 7);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.news_curation_audit (admin_id, action, curation_type, period_start, position, before_data, after_data)
  VALUES (v_admin, 'clear_week', NULL, v_week, NULL, v_before, NULL);

  RETURN json_build_object('removed', v_deleted, 'week_start', v_week, 'today', v_today);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_clear_news_curation(date) TO authenticated;

CREATE OR REPLACE TRIGGER trg_news_curation_updated_at
BEFORE UPDATE ON public.news_curation
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();