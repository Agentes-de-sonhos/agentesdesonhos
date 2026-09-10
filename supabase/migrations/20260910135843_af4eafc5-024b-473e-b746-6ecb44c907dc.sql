CREATE OR REPLACE FUNCTION public.can_use_reservations_center()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF public.has_role(v_uid, 'admin'::public.app_role)
     OR public.has_role(v_uid, 'promotor'::public.app_role) THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_feature_access ufa
              WHERE ufa.user_id = v_uid AND ufa.feature_key = 'crm_basic') THEN
    RETURN true;
  END IF;

  -- Colaborador ativo NÃO tem passe livre: effective_subscription() já resolve
  -- o plano da conta master para ele, então a checagem de plano vale para todos.
  SELECT es.plan, es.is_active, es.expires_at
    INTO v_plan, v_active, v_expires
    FROM public.effective_subscription() es
   LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN false; END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN RETURN false; END IF;

  RETURN COALESCE(v_plan, 'start') IN ('premium', 'fundador', 'promo_grupo_sc');
END $$;

REVOKE ALL ON FUNCTION public.can_use_reservations_center() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_reservations_center() TO authenticated, service_role;