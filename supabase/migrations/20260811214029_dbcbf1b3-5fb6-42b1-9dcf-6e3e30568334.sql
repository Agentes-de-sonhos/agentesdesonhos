INSERT INTO public.plan_team_limits (plan, max_members, owner_counts, updated_at)
SELECT 'promo_grupo_sc'::public.subscription_plan, p.max_members, p.owner_counts, now()
FROM public.plan_team_limits p
WHERE p.plan = 'premium'::public.subscription_plan
ON CONFLICT (plan) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calling_user uuid;
  owner_id uuid;
  user_sub RECORD;
  monthly_limit INTEGER;
BEGIN
  calling_user := auth.uid();
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: autenticação necessária';
  END IF;
  IF _user_id <> calling_user THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users AI usage';
  END IF;

  -- Colaborador de equipe consome a assinatura efetiva da conta master.
  SELECT COALESCE(
    (SELECT m.agency_id FROM public.agency_team_members m
      WHERE m.auth_user_id = calling_user AND m.status = 'active'
      ORDER BY m.created_at LIMIT 1),
    calling_user
  ) INTO owner_id;

  SELECT * INTO user_sub FROM public.subscriptions
  WHERE user_id = owner_id AND is_active = true LIMIT 1;

  IF user_sub IS NULL THEN RETURN false; END IF;

  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions
    SET ai_usage_count = 0, ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;

  CASE user_sub.plan
    WHEN 'premium' THEN monthly_limit := 999999;
    WHEN 'promo_grupo_sc' THEN monthly_limit := 999999;
    WHEN 'profissional' THEN monthly_limit := 1000;
    WHEN 'fundador' THEN monthly_limit := 1000;
    WHEN 'start' THEN monthly_limit := 0;
    WHEN 'essencial' THEN monthly_limit := 0;
    WHEN 'cartao_digital' THEN monthly_limit := 0;
    WHEN 'educa_pass' THEN monthly_limit := 0;
    ELSE monthly_limit := 0;
  END CASE;

  IF user_sub.ai_usage_count >= monthly_limit THEN RETURN false; END IF;

  UPDATE public.subscriptions SET ai_usage_count = ai_usage_count + 1 WHERE id = user_sub.id;
  RETURN true;
END;
$function$;