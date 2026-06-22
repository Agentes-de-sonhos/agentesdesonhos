
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.help_center_chunks (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  module text,
  submodule text,
  type text,
  audience text[] DEFAULT '{}'::text[],
  plan text,
  permissions text,
  intents text[] DEFAULT '{}'::text[],
  keywords text[] DEFAULT '{}'::text[],
  confidence text,
  status text,
  related_ids text[] DEFAULT '{}'::text[],
  source_reference text,
  last_reviewed date,
  search_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_help_center_chunks_status_conf ON public.help_center_chunks (status, confidence);
CREATE INDEX IF NOT EXISTS idx_help_center_chunks_module ON public.help_center_chunks (module);
CREATE INDEX IF NOT EXISTS idx_help_center_chunks_search_text_trgm ON public.help_center_chunks USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_help_center_chunks_keywords ON public.help_center_chunks USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_help_center_chunks_intents ON public.help_center_chunks USING gin (intents);

GRANT SELECT ON public.help_center_chunks TO authenticated;
GRANT ALL ON public.help_center_chunks TO service_role;
ALTER TABLE public.help_center_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users can read chunks" ON public.help_center_chunks FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.help_assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hac_user ON public.help_assistant_conversations(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_assistant_conversations TO authenticated;
GRANT ALL ON public.help_assistant_conversations TO service_role;
ALTER TABLE public.help_assistant_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own conversations" ON public.help_assistant_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.help_assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.help_assistant_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  sources jsonb,
  fallback_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ham_conversation ON public.help_assistant_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ham_user ON public.help_assistant_messages(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.help_assistant_messages TO authenticated;
GRANT ALL ON public.help_assistant_messages TO service_role;
ALTER TABLE public.help_assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own messages" ON public.help_assistant_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own messages" ON public.help_assistant_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.help_assistant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.help_assistant_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_haf_user ON public.help_assistant_feedback(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_assistant_feedback TO authenticated;
GRANT ALL ON public.help_assistant_feedback TO service_role;
ALTER TABLE public.help_assistant_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own feedback" ON public.help_assistant_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.help_assistant_unanswered (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  reason text,
  module_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
);
CREATE INDEX IF NOT EXISTS idx_hau_status ON public.help_assistant_unanswered(status, created_at DESC);
GRANT INSERT ON public.help_assistant_unanswered TO authenticated;
GRANT ALL ON public.help_assistant_unanswered TO service_role;
ALTER TABLE public.help_assistant_unanswered ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own unanswered" ON public.help_assistant_unanswered FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read unanswered" ON public.help_assistant_unanswered FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
