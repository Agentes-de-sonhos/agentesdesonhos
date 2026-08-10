CREATE OR REPLACE FUNCTION public.admin_set_news_curation(p_curation_type text, p_noticia_id uuid, p_position integer DEFAULT NULL::integer, p_period_start date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_period date;
  v_before jsonb;
  v_row public.news_curation;
  v_pub_date date;
  v_status text;
  v_hidden boolean;
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

  SELECT (n.data_publicacao AT TIME ZONE 'America/Sao_Paulo')::date, n.status, COALESCE(n.hidden, false)
    INTO v_pub_date, v_status, v_hidden
  FROM public.noticias_dashboard n
  WHERE n.id = p_noticia_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'news not found';
  END IF;
  IF v_status <> 'aprovado' OR v_hidden THEN
    RAISE EXCEPTION 'invalid_curation_period: news must be approved and visible';
  END IF;

  v_period := COALESCE(
    p_period_start,
    CASE WHEN p_curation_type = 'daily' THEN public.news_today_sp() ELSE public.news_week_start_sp() END
  );

  IF p_curation_type = 'daily' THEN
    IF v_pub_date IS DISTINCT FROM v_period THEN
      RAISE EXCEPTION 'invalid_curation_period: news was not published on %', v_period;
    END IF;
  ELSE
    IF EXTRACT(ISODOW FROM v_period) <> 1 THEN
      RAISE EXCEPTION 'invalid_curation_period: period_start must be a Monday';
    END IF;
    IF v_pub_date IS NULL OR v_pub_date < v_period OR v_pub_date >= v_period + 7 THEN
      RAISE EXCEPTION 'invalid_curation_period: news is outside the week starting %', v_period;
    END IF;
  END IF;

  SELECT jsonb_agg(to_jsonb(c)) INTO v_before
  FROM public.news_curation c
  WHERE c.curation_type = p_curation_type AND c.period_start = v_period;

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

  RETURN json_build_object('ok', true, 'period_start', v_period, 'curation', to_jsonb(v_row));
END;
$function$;