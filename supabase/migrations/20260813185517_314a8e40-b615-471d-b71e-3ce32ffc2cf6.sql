-- 1) Agency-scoped access to commercial signatures (preserve existing owner + public read policies)
DROP POLICY IF EXISTS "Agency members manage signatures" ON public.commercial_signatures;
CREATE POLICY "Agency members manage signatures" ON public.commercial_signatures
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_agency_member(user_id))
  WITH CHECK (user_id = auth.uid() OR public.is_agency_member(user_id));

-- 2) Secure base data of the agency holder (owner/master/subscriber)
CREATE OR REPLACE FUNCTION public.get_agency_signature_base(_agency_id uuid)
RETURNS TABLE(user_id uuid, name text, phone text, avatar_url text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _agency_id IS NULL THEN
    RETURN;
  END IF;

  -- Only the holder themselves or a member of the same agency may read it
  IF NOT (_agency_id = auth.uid() OR public.is_agency_member(_agency_id)) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.user_id,
         p.name,
         p.phone,
         p.avatar_url,
         u.email::text
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = _agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agency_signature_base(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agency_signature_base(uuid) TO authenticated;

-- 3) Conservative normalization: keep only the most recent default per owner (no deletes)
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.commercial_signatures
  WHERE is_default = true
)
UPDATE public.commercial_signatures cs
   SET is_default = false
  FROM ranked r
 WHERE cs.id = r.id AND r.rn > 1;

-- 4) Guarantee at most one default per owner/agency
CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_signatures_one_default
  ON public.commercial_signatures(user_id)
  WHERE is_default = true;