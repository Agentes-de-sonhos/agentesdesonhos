-- Interruptor manual do pop-up "Nova versão disponível".
-- Linha única controlada apenas pela plataforma (service role): ativa o aviso
-- para a versão publicada; usuários veem o prompt uma única vez.
CREATE TABLE IF NOT EXISTS public.app_update_prompt (
  id integer PRIMARY KEY CHECK (id = 1),
  version text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_update_prompt TO anon;
GRANT SELECT ON public.app_update_prompt TO authenticated;
GRANT ALL ON public.app_update_prompt TO service_role;

ALTER TABLE public.app_update_prompt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_update_prompt_public_read"
  ON public.app_update_prompt
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.app_update_prompt (id, version, is_active)
VALUES (1, 'none', false)
ON CONFLICT (id) DO NOTHING;
