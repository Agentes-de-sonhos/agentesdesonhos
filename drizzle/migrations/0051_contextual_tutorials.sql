CREATE TABLE public.contextual_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key text NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contextual_tutorials TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contextual_tutorials TO authenticated;
GRANT ALL ON public.contextual_tutorials TO service_role;
ALTER TABLE public.contextual_tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logged users read active tutorials" ON public.contextual_tutorials FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage tutorials" ON public.contextual_tutorials FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX contextual_tutorials_ctx_idx ON public.contextual_tutorials(context_key, sort_order);

CREATE TABLE public.contextual_tutorial_views (
  user_id uuid NOT NULL,
  tutorial_id uuid NOT NULL REFERENCES public.contextual_tutorials(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'watched',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tutorial_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contextual_tutorial_views TO authenticated;
GRANT ALL ON public.contextual_tutorial_views TO service_role;
ALTER TABLE public.contextual_tutorial_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own tutorial progress" ON public.contextual_tutorial_views FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());