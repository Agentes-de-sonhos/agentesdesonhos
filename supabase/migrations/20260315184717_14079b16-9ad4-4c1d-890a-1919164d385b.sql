
-- Allow admins to delete any review
CREATE POLICY "Admins can delete any review"
  ON public.operator_reviews FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit log for moderated reviews
CREATE TABLE public.operator_review_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  rating smallint NOT NULL,
  reaction text,
  comment text,
  reason text,
  moderated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_review_moderation_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read/insert moderation logs
CREATE POLICY "Admins can read moderation logs"
  ON public.operator_review_moderation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert moderation logs"
  ON public.operator_review_moderation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
