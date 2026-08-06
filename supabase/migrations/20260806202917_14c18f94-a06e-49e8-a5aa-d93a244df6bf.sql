CREATE OR REPLACE FUNCTION public.email_account_exists(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(_email)
      AND u.deleted_at IS NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.email_account_exists(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.email_account_exists(text) TO authenticated, service_role;