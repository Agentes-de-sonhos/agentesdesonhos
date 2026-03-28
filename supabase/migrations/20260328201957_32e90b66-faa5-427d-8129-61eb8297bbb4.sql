
-- Performance indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON public.user_sessions (user_id, started_at);
