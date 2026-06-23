
-- 1) Normalize all existing emails (trim + lowercase, empty -> NULL)
UPDATE public.clients
SET email = NULLIF(lower(trim(email)), '')
WHERE email IS NOT NULL;

-- 2) Resolve existing duplicates within the same agency by suffixing the newer rows
WITH ranked AS (
  SELECT id, user_id, email,
    row_number() OVER (PARTITION BY user_id, email ORDER BY created_at ASC, id ASC) AS rn
  FROM public.clients
  WHERE email IS NOT NULL
)
UPDATE public.clients c
SET email = regexp_replace(r.email, '@', '+dup' || r.rn || '@')
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 3) Trigger: normalize email on insert/update
CREATE OR REPLACE FUNCTION public.normalize_client_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email = NULLIF(lower(trim(NEW.email)), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_client_email ON public.clients;
CREATE TRIGGER trg_normalize_client_email
BEFORE INSERT OR UPDATE OF email ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.normalize_client_email();

-- 4) Unique index per agency on normalized email (ignores NULL/empty)
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_email_unique_idx
ON public.clients (user_id, email)
WHERE email IS NOT NULL AND email <> '';
