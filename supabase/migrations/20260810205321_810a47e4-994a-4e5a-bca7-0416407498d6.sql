-- 1) Plano efetivo: colaborador herda a assinatura da conta master (agência resolvida no servidor)
CREATE OR REPLACE FUNCTION public.effective_subscription()
RETURNS TABLE (
  owner_user_id uuid,
  inherited boolean,
  plan text,
  is_active boolean,
  expires_at timestamptz,
  ai_usage_count integer,
  ai_usage_reset_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           COALESCE(
             (SELECT m.agency_id FROM public.agency_team_members m
               WHERE m.auth_user_id = auth.uid() AND m.status = 'active'
               ORDER BY m.created_at LIMIT 1),
             auth.uid()
           ) AS owner
    WHERE auth.uid() IS NOT NULL
  )
  SELECT me.owner,
         me.owner <> me.uid,
         s.plan::text,
         COALESCE(s.is_active, false),
         s.expires_at,
         COALESCE(s.ai_usage_count, 0),
         s.ai_usage_reset_at
  FROM me
  LEFT JOIN public.subscriptions s ON s.user_id = me.owner AND s.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.effective_subscription() TO authenticated;

-- 2) Uso de IA consome a cota da conta master quando o chamador é colaborador
CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3) Visão administrativa: colaboradores e convites com e-mail real, perfil e plano herdado
CREATE OR REPLACE FUNCTION public.admin_team_accounts_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'member_id', m.id,
        'auth_user_id', m.auth_user_id,
        'auth_exists', EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.auth_user_id),
        'agency_id', m.agency_id,
        'full_name', m.full_name,
        'real_email', COALESCE(m.email, m.notification_email, m.login),
        'status', m.status,
        'department', m.department,
        'role_title', m.role_title,
        'created_at', m.created_at,
        'access_profile_name', (SELECT ap.name FROM public.agency_access_profiles ap WHERE ap.id = m.access_profile_id),
        'master_name', (SELECT p.name FROM public.profiles p WHERE p.user_id = m.agency_id),
        'master_agency_name', (SELECT p.agency_name FROM public.profiles p WHERE p.user_id = m.agency_id),
        'effective_plan', (SELECT s.plan::text FROM public.subscriptions s WHERE s.user_id = m.agency_id AND s.is_active = true LIMIT 1)
      ) ORDER BY m.created_at DESC)
      FROM public.agency_team_members m
    ), '[]'::jsonb),
    'invites', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invite_id', i.id,
        'agency_id', i.agency_id,
        'email', i.email,
        'full_name', i.full_name,
        'role_title', i.role_title,
        'department', i.department,
        'expires_at', i.expires_at,
        'sent_count', i.sent_count,
        'last_sent_at', i.last_sent_at,
        'created_at', i.created_at,
        'access_profile_name', (SELECT ap.name FROM public.agency_access_profiles ap WHERE ap.id = i.access_profile_id),
        'master_name', (SELECT p.name FROM public.profiles p WHERE p.user_id = i.agency_id),
        'master_agency_name', (SELECT p.agency_name FROM public.profiles p WHERE p.user_id = i.agency_id),
        'effective_plan', (SELECT s.plan::text FROM public.subscriptions s WHERE s.user_id = i.agency_id AND s.is_active = true LIMIT 1)
      ) ORDER BY i.created_at DESC)
      FROM public.agency_team_invites i
      WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_team_accounts_overview() TO authenticated;

-- 4) Integridade: registros de equipe ativos sem login existente não devem contar como usuários ativos
CREATE OR REPLACE FUNCTION public.team_orphan_members()
RETURNS TABLE (member_id uuid, agency_id uuid, full_name text, login text, auth_user_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.agency_id, m.full_name, m.login, m.auth_user_id, m.status::text
  FROM public.agency_team_members m
  WHERE public.has_role(auth.uid(), 'admin')
    AND m.status <> 'pending'
    AND (m.auth_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.auth_user_id));
$$;

GRANT EXECUTE ON FUNCTION public.team_orphan_members() TO authenticated;

-- 5) Vagas ocupadas ignoram registros órfãos (auth inexistente)
CREATE OR REPLACE FUNCTION public.team_seats_taken(_agency_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(*) FROM public.agency_team_members m
     WHERE m.agency_id = _agency_id
       AND m.status IN ('active', 'blocked')
       AND m.auth_user_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.auth_user_id)
  ) + (
    SELECT count(*) FROM public.agency_team_invites i
     WHERE i.agency_id = _agency_id
       AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
  );
$$;
