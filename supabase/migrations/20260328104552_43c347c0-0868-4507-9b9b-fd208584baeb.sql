
-- 1. Remove the dangerous permissive INSERT policy that allows users to self-assign any role
DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

-- 2. Remove any overly permissive UPDATE policies
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;

-- 3. Create a secure function for admin-only role changes
CREATE OR REPLACE FUNCTION public.admin_update_user_role(_target_user_id uuid, _new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar roles';
  END IF;

  -- Prevent removing own admin role
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode alterar seu próprio role';
  END IF;

  -- Update the role
  UPDATE public.user_roles
  SET role = _new_role
  WHERE user_id = _target_user_id;

  -- If no row existed, insert one
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
  END IF;

  RETURN true;
END;
$$;

-- 4. Ensure UPDATE policy on user_roles is admin-only
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Ensure INSERT policy on user_roles is admin-only (trigger handles signup)
-- The handle_new_user_role() trigger already assigns 'agente' on signup via SECURITY DEFINER
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Ensure DELETE policy is admin-only
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
