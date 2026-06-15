-- 1) Remove a policy que permitia leitura anônima ampla
DROP POLICY IF EXISTS "Public can view basic profile data" ON public.profiles;

-- 2) Revoga o GRANT de SELECT para o role anon (defesa em profundidade)
REVOKE SELECT ON public.profiles FROM anon;

-- 3) Garante que a RPC pública continua disponível para anon e authenticated
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;