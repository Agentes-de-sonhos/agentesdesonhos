
-- Table to log all impersonation events
CREATE TABLE public.impersonation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can view impersonation logs"
ON public.impersonation_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert logs
CREATE POLICY "Admins can insert impersonation logs"
ON public.impersonation_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update logs (to set ended_at)
CREATE POLICY "Admins can update impersonation logs"
ON public.impersonation_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
