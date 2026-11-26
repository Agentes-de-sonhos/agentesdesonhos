ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS blog_email_opt_out boolean NOT NULL DEFAULT false;

CREATE TABLE public.blog_newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.site_blog_posts(id) ON DELETE CASCADE,
  statuses text[] NOT NULL DEFAULT '{}',
  sender text NOT NULL,
  recipients integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_newsletter_sends TO authenticated;
GRANT ALL ON public.blog_newsletter_sends TO service_role;
ALTER TABLE public.blog_newsletter_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blog managers read own agency sends" ON public.blog_newsletter_sends
  FOR SELECT TO authenticated USING (public.blog_can_manage(agency_id));
CREATE INDEX blog_newsletter_sends_post_idx ON public.blog_newsletter_sends(post_id, created_at DESC);