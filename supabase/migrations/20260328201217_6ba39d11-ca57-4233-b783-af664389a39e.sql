
-- Table to track user sessions (login/logout with duration)
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions (user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions (started_at DESC);
CREATE INDEX idx_user_sessions_active ON public.user_sessions (user_id, ended_at) WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert/update their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all sessions
CREATE POLICY "Admins can read all sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read own sessions
CREATE POLICY "Users can read own sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Function to get user analytics for admin
CREATE OR REPLACE FUNCTION public.get_user_analytics(
  _start_date timestamptz DEFAULT NULL,
  _end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  avatar_url text,
  agency_name text,
  total_sessions bigint,
  total_duration_minutes bigint,
  first_access timestamptz,
  last_access timestamptz,
  avg_session_minutes numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    COALESCE(p.name, 'Usuário')::text AS user_name,
    p.avatar_url::text,
    p.agency_name::text,
    COUNT(us.id)::bigint AS total_sessions,
    COALESCE(SUM(us.duration_seconds) / 60, 0)::bigint AS total_duration_minutes,
    MIN(us.started_at) AS first_access,
    MAX(us.started_at) AS last_access,
    ROUND(COALESCE(AVG(us.duration_seconds) / 60.0, 0), 1)::numeric AS avg_session_minutes
  FROM public.user_sessions us
  LEFT JOIN public.profiles p ON p.user_id = us.user_id
  WHERE 
    (_start_date IS NULL OR us.started_at >= _start_date)
    AND (_end_date IS NULL OR us.started_at <= _end_date)
  GROUP BY us.user_id, p.name, p.avatar_url, p.agency_name
  ORDER BY total_duration_minutes DESC;
END;
$$;

-- Enable realtime for presence awareness
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
