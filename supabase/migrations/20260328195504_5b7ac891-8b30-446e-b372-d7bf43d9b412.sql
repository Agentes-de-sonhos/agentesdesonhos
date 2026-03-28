
-- Security definer function to check if a user's subscription is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.subscriptions 
     WHERE user_id = _user_id 
     LIMIT 1),
    true
  )
$$;

-- Table to log admin actions like deactivation
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can read action logs"
ON public.admin_action_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert logs
CREATE POLICY "Admins can insert action logs"
ON public.admin_action_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
