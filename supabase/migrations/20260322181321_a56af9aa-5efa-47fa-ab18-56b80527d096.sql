
-- Optimized function to get online premium users in a single query
-- Replaces 3 separate queries (user_presence + profiles + subscriptions)
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
  FROM user_presence up
  INNER JOIN profiles p ON p.user_id = up.user_id
  INNER JOIN subscriptions s ON s.user_id = up.user_id
    AND s.plan = 'profissional'
    AND s.is_active = true
  WHERE up.is_online = true
    AND up.last_active_at >= (now() - interval '5 minutes')
    AND (up.user_id != _exclude_user_id OR _exclude_user_id IS NULL)
$$;
