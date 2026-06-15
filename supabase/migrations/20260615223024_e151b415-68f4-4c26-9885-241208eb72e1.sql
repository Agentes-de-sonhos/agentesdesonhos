-- Fase 2: Restringir SELECT em public.profiles
-- Remove a política permissiva que permite qualquer usuário autenticado ler todos os perfis
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Cria política restritiva: usuário só lê o próprio perfil; admins leem todos
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );