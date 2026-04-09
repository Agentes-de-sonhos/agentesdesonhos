
-- Table for admin support mode audit logs
CREATE TABLE public.admin_resource_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'quote', 'trip', 'itinerary', 'card'
  resource_id UUID NOT NULL,
  resource_owner_id UUID,
  action TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit'
  url_input TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_resource_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access logs"
ON public.admin_resource_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert access logs"
ON public.admin_resource_access_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_resource_logs_admin ON public.admin_resource_access_logs(admin_user_id);
CREATE INDEX idx_admin_resource_logs_resource ON public.admin_resource_access_logs(resource_type, resource_id);
CREATE INDEX idx_admin_resource_logs_created ON public.admin_resource_access_logs(created_at DESC);
