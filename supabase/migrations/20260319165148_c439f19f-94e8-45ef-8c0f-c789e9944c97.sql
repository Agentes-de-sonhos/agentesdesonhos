
CREATE TABLE public.feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feedback_settings"
ON public.feedback_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read feedback_settings"
ON public.feedback_settings
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.feedback_settings (key, value)
VALUES ('feedback_popup_enabled', 'false');
