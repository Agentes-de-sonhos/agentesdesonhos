-- Fase 2 da Comunidade: relações sociais (conexões sem duplicidade invertida + acompanhamento)

-- 1. Impede duplicidade da mesma relação, inclusive com remetente/destinatário invertidos
CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_pair
  ON public.connections (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));

-- 2. Impede solicitação para si mesmo
ALTER TABLE public.connections
  ADD CONSTRAINT connections_no_self CHECK (requester_id <> receiver_id);

-- 3. Índices para as consultas de Minha Rede
CREATE INDEX IF NOT EXISTS connections_receiver_status_idx ON public.connections (receiver_id, status);
CREATE INDEX IF NOT EXISTS connections_requester_status_idx ON public.connections (requester_id, status);

-- 4. Autores que o usuário deixou de seguir (não desfaz a conexão)
CREATE TABLE IF NOT EXISTS public.community_muted_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_muted_authors_unique UNIQUE (user_id, author_id),
  CONSTRAINT community_muted_authors_no_self CHECK (user_id <> author_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_muted_authors TO authenticated;
GRANT ALL ON public.community_muted_authors TO service_role;

ALTER TABLE public.community_muted_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own muted authors"
  ON public.community_muted_authors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mute authors for themselves"
  ON public.community_muted_authors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unmute own authors"
  ON public.community_muted_authors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_muted_authors_user_idx ON public.community_muted_authors (user_id);
