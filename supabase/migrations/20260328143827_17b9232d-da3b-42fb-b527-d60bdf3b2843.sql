CREATE OR REPLACE FUNCTION public.get_registration_link(_token text)
RETURNS TABLE(plan text, role text, max_uses integer, uses_count integer, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    rl.plan::text,
    rl.role::text,
    rl.max_uses,
    rl.uses_count,
    rl.expires_at
  FROM public.registration_links rl
  WHERE rl.token = _token;
$$;