-- 1) Ligação explícita entre o modelo do Site Lab e um tenant técnico isolado.
ALTER TABLE public.sitelab_templates
  ADD COLUMN IF NOT EXISTS admin_hostname text;

UPDATE public.sitelab_templates
   SET admin_hostname = 'sitelab.local', updated_at = now()
 WHERE slug = 'sitelab-base';

CREATE OR REPLACE FUNCTION public.get_sitelab_template(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', t.slug,
    'name', t.name,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'tertiary_color', t.tertiary_color,
    'background_color', t.background_color,
    'admin_hostname', t.admin_hostname,
    'custom_overrides', t.custom_overrides
  )
  FROM public.sitelab_templates t
  WHERE t.is_active AND t.slug = lower(btrim(p_slug))
  LIMIT 1
$$;

-- 2) Tenant técnico do laboratório: hostname NÃO público, isolado, sem vínculo
--    com nenhuma agência real. Pode permanecer vazio.
INSERT INTO public.agency_public_domains
  (hostname, user_id, agency_slug, is_primary, is_active, admin_portal_enabled)
SELECT 'sitelab.local', '11111111-1111-4111-8111-111111111111'::uuid, 'sitelab-base', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_public_domains WHERE hostname = 'sitelab.local'
);

-- 3) Autorização: regra ADITIVA e restrita ao tenant técnico do laboratório —
--    somente administradores da plataforma entram nele. Os domínios reais
--    continuam exigindo exatamente o mesmo vínculo de antes.
CREATE OR REPLACE FUNCTION public.agency_admin_access_check(p_hostname text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_agency uuid;
  v_enabled boolean;
  v_allowed boolean := false;
  v_lab uuid := '11111111-1111-4111-8111-111111111111';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  SELECT d.user_id, d.admin_portal_enabled
    INTO v_agency, v_enabled
    FROM public.agency_public_domains d
   WHERE d.hostname = lower(trim(p_hostname))
     AND d.is_active = true
   LIMIT 1;

  IF v_agency IS NULL OR NOT v_enabled THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  IF public.is_user_active(v_uid) THEN
    v_allowed := v_agency = v_uid
      OR EXISTS (
        SELECT 1
          FROM public.agency_membership m
         WHERE m.user_id = v_uid
           AND m.agency_id = v_agency
      )
      OR (v_agency = v_lab AND public.has_role(v_uid, 'admin'::app_role));
  END IF;

  RETURN jsonb_build_object('allowed', v_allowed);
END;
$$;