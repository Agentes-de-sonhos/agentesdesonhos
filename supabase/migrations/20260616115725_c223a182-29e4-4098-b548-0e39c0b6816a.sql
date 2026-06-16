-- 1. Nova tabela isolada (sem acesso PostgREST)
CREATE TABLE public.agency_team_member_secrets (
  member_id uuid PRIMARY KEY
    REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Bloquear PostgREST: revogar anon/authenticated, dar tudo ao service_role
REVOKE ALL ON public.agency_team_member_secrets FROM PUBLIC;
REVOKE ALL ON public.agency_team_member_secrets FROM anon;
REVOKE ALL ON public.agency_team_member_secrets FROM authenticated;
GRANT  ALL ON public.agency_team_member_secrets TO service_role;

-- 3. RLS ligada sem policies = deny-all para anon/authenticated (service_role bypassa)
ALTER TABLE public.agency_team_member_secrets ENABLE ROW LEVEL SECURITY;

-- 4. Migrar hashes existentes
INSERT INTO public.agency_team_member_secrets (member_id, password_hash)
SELECT id, password_hash
FROM public.agency_team_members
WHERE password_hash IS NOT NULL
ON CONFLICT (member_id) DO NOTHING;

-- 5. Neutralizar coluna antiga (mantida para rollback)
ALTER TABLE public.agency_team_members
  ALTER COLUMN password_hash DROP NOT NULL;

UPDATE public.agency_team_members SET password_hash = NULL;

-- 6. Revogar SELECT da coluna antiga enquanto ela ainda existir
REVOKE SELECT (password_hash) ON public.agency_team_members FROM anon;
REVOKE SELECT (password_hash) ON public.agency_team_members FROM authenticated;