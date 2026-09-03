-- Reverte integralmente `agency_admin_access_check` à lógica anterior:
-- somente o dono do domínio ou um vínculo real em agency_membership.
-- Nenhuma exceção para administradores da plataforma (risco de misturar o
-- contexto de dados da conta do próprio administrador com o laboratório).
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
      );
  END IF;

  RETURN jsonb_build_object('allowed', v_allowed);
END;
$$;

-- O tenant técnico do laboratório permanece registrado (identidade/paleta), mas
-- com o painel administrativo DESABILITADO até existir provisionamento de uma
-- conta técnica própria. Assim nenhuma sessão real pode abrir o painel nele.
UPDATE public.agency_public_domains
   SET admin_portal_enabled = false, updated_at = now()
 WHERE hostname = 'sitelab.local';