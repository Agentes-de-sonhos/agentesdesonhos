-- Estado público derivado das datas: agendada vira ativa em publish_at e vence em expires_at, sem depender do job.
CREATE OR REPLACE FUNCTION public.offer_is_live(o public.offers)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT o.status IN ('published','scheduled') AND o.publish_at IS NOT NULL AND o.publish_at <= now()
     AND o.expires_at IS NOT NULL AND o.expires_at >= now()
$$;

CREATE OR REPLACE FUNCTION public.get_public_offers(p_hostname text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(o.public_snapshot || jsonb_build_object('status','published') ORDER BY o.publish_at DESC), '[]'::jsonb)
  FROM public.offers o
  WHERE o.agency_owner_id = public.offer_owner_for_host(p_hostname)
    AND public.offer_is_live(o)
$$;

CREATE OR REPLACE FUNCTION public.get_public_offer_by_slug(p_hostname text, p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.offers; v_owner uuid := public.offer_owner_for_host(p_hostname);
BEGIN
  IF v_owner IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  SELECT * INTO o FROM public.offers WHERE agency_owner_id = v_owner AND slug = lower(btrim(coalesce(p_slug,'')));
  IF o.id IS NULL OR o.status = 'draft' THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF o.status = 'paused' THEN RETURN jsonb_build_object('status','paused'); END IF;
  IF public.offer_is_live(o) THEN RETURN o.public_snapshot || jsonb_build_object('status','published'); END IF;
  IF o.status = 'scheduled' THEN RETURN jsonb_build_object('status','not_found'); END IF;
  RETURN o.public_snapshot || jsonb_build_object('status', CASE WHEN o.status = 'ended' THEN 'ended' ELSE 'expired' END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_offers(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_offer_by_slug(text, text) TO anon, authenticated;
