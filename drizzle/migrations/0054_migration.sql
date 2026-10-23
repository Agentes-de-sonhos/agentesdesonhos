ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS display_channels text[] NOT NULL DEFAULT '{ofertas}';

CREATE OR REPLACE FUNCTION public.get_public_offers(p_hostname text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(jsonb_agg(o.public_snapshot || jsonb_build_object('status','published','channels', to_jsonb(o.display_channels)) ORDER BY o.publish_at DESC), '[]'::jsonb)
  FROM public.offers o
  WHERE o.agency_owner_id = public.offer_owner_for_host(p_hostname)
    AND public.offer_is_live(o)
$function$;