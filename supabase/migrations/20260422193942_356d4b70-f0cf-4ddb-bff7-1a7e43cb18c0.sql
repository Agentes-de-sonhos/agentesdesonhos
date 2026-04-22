CREATE OR REPLACE FUNCTION public.admin_export_users()
RETURNS TABLE(
  name text,
  email text,
  phone text,
  cpf text,
  agency_name text,
  cnpj text,
  street text,
  address_number text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  plan text,
  is_active boolean,
  stripe_customer_id text,
  stripe_subscription_id text,
  roles text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.name,
    u.email::text,
    p.phone,
    p.cpf,
    p.agency_name,
    p.cnpj,
    p.street,
    p.address_number,
    p.neighborhood,
    p.city,
    p.state,
    p.zip_code,
    s.plan::text,
    s.is_active,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    (SELECT string_agg(DISTINCT r.role::text, ', ') FROM public.user_roles r WHERE r.user_id = p.user_id) AS roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_export_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_export_users() TO authenticated;