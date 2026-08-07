CREATE TABLE public.agency_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  entitlement_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  granted_by uuid NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_entitlements_key_not_blank CHECK (btrim(entitlement_key) <> ''),
  CONSTRAINT agency_entitlements_unique UNIQUE (agency_id, entitlement_key)
);

CREATE INDEX idx_agency_entitlements_agency ON public.agency_entitlements (agency_id);
CREATE INDEX idx_agency_entitlements_key_active ON public.agency_entitlements (entitlement_key, is_active);
CREATE INDEX idx_agency_entitlements_lookup ON public.agency_entitlements (agency_id, entitlement_key) WHERE is_active;

GRANT SELECT ON public.agency_entitlements TO authenticated;
GRANT ALL ON public.agency_entitlements TO service_role;

ALTER TABLE public.agency_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read their agency entitlements"
ON public.agency_entitlements
FOR SELECT
TO authenticated
USING (
  agency_id = auth.uid()
  OR agency_id = public.current_agency_id()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage agency entitlements"
ON public.agency_entitlements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_agency_entitlements_updated_at
BEFORE UPDATE ON public.agency_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.agency_has_entitlement(_agency_id uuid, _key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_entitlements e
    WHERE e.agency_id = _agency_id
      AND e.entitlement_key = _key
      AND e.is_active
      AND (e.starts_at IS NULL OR e.starts_at <= now())
      AND (e.ends_at IS NULL OR e.ends_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.current_agency_has_entitlement(_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.agency_has_entitlement(COALESCE(public.current_agency_id(), auth.uid()), _key)
$$;

CREATE OR REPLACE FUNCTION public.current_agency_entitlements()
RETURNS TABLE (entitlement_key text, ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.entitlement_key, e.ends_at
  FROM public.agency_entitlements e
  WHERE e.agency_id = COALESCE(public.current_agency_id(), auth.uid())
    AND e.is_active
    AND (e.starts_at IS NULL OR e.starts_at <= now())
    AND (e.ends_at IS NULL OR e.ends_at > now())
$$;

REVOKE ALL ON FUNCTION public.agency_has_entitlement(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_agency_has_entitlement(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_agency_entitlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_has_entitlement(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_agency_has_entitlement(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_agency_entitlements() TO authenticated, service_role;