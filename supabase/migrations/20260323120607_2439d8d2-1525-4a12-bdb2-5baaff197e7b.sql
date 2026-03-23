CREATE OR REPLACE FUNCTION public.get_online_premium_users(_exclude_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    COALESCE(p.name, 'Agente')::text AS name,
    p.avatar_url::text,
    p.agency_name::text,
    p.city::text
  FROM public.user_presence up
  INNER JOIN public.profiles p ON p.user_id = up.user_id
  INNER JOIN public.subscriptions s ON s.user_id = up.user_id
    AND s.plan IN ('profissional', 'fundador')
    AND s.is_active = true
  WHERE up.is_online = true
    AND up.last_active_at >= (now() - interval '5 minutes')
    AND (up.user_id != _exclude_user_id OR _exclude_user_id IS NULL);
$$;