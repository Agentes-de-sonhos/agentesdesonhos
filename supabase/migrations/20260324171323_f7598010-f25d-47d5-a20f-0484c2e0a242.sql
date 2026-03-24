CREATE TABLE public.user_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature access"
ON public.user_feature_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own feature access"
ON public.user_feature_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_user_feature_access_user_id ON public.user_feature_access(user_id);
CREATE INDEX idx_user_feature_access_feature ON public.user_feature_access(feature_key);