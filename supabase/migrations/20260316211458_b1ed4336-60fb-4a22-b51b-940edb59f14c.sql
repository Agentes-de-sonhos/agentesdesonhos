
CREATE TABLE public.registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  plan text NOT NULL DEFAULT 'profissional',
  role text NOT NULL DEFAULT 'agente',
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage registration links"
ON public.registration_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read links by token"
ON public.registration_links
FOR SELECT
TO anon
USING (true);
