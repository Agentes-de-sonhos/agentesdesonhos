CREATE OR REPLACE FUNCTION public.news_highlights()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
  v_fallback boolean := false;
  v_cut timestamptz;
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

  -- Fallback: sem curadoria manual e sem publicacoes na janela do periodo,
  -- usa as mais recentes das ultimas 24h e, se ainda vazio, das ultimas 48h.
  IF v_manual_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.noticias_dashboard nd
      WHERE nd.status = 'aprovado' AND nd.hidden = false
        AND nd.data_publicacao >= v_feat_start
    ) THEN
      FOREACH v_cut IN ARRAY ARRAY[now() - interval '24 hours', now() - interval '48 hours'] LOOP
        IF EXISTS (
          SELECT 1 FROM public.noticias_dashboard nd
          WHERE nd.status = 'aprovado' AND nd.hidden = false
            AND nd.data_publicacao >= v_cut
        ) THEN
          v_feat_start := v_cut;
          v_fallback := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

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
    'featured_fallback', v_fallback,
    'top5', COALESCE(v_top5, '[]'::json)
  );
END;
$function$;