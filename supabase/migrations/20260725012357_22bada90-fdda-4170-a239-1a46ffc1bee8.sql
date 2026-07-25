CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  agency_id uuid,
  route text NOT NULL,
  phase text NOT NULL DEFAULT 'render',
  error_name text,
  error_message text NOT NULL,
  component_stack text,
  stack text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.app_error_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_error_logs TO service_role;
GRANT SELECT ON public.app_error_logs TO authenticated;

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own app error logs"
ON public.app_error_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read app error logs"
ON public.app_error_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_app_error_logs_user_created_at
ON public.app_error_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_logs_route_created_at
ON public.app_error_logs (route, created_at DESC);