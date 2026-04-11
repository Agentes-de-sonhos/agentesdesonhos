
-- Table for business card captures
CREATE TABLE public.crm_card_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Person data
  person_name TEXT,
  job_title TEXT,
  company_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  
  -- Social media
  social_links JSONB DEFAULT '{}',
  
  -- Logo
  logo_url TEXT,
  
  -- Classification
  contact_type TEXT DEFAULT 'outro', -- agente_viagens, fornecedor, cliente, outro
  is_existing_client BOOLEAN,
  geographic_scope TEXT, -- nacional, internacional
  supplier_category TEXT,
  
  -- Extra fields
  notes TEXT,
  event_origin TEXT,
  lead_temperature TEXT, -- quente, morno, frio
  next_action TEXT,
  
  -- Control
  capture_origin TEXT DEFAULT 'cartao_visita',
  captured_at TIMESTAMPTZ DEFAULT now(),
  crm_contact_id UUID, -- link to crm_contacts if merged
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_card_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage card captures"
  ON public.crm_card_captures
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Quick access tokens for event use
CREATE TABLE public.admin_quick_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_quick_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quick access tokens"
  ON public.admin_quick_access_tokens
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC to validate quick access token (public, no auth needed)
CREATE OR REPLACE FUNCTION public.validate_quick_access_token(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT user_id INTO found_user_id
  FROM public.admin_quick_access_tokens
  WHERE token = _token
    AND is_active = true
    AND expires_at > now();
  
  RETURN found_user_id;
END;
$$;

-- RPC to save card capture from quick access (bypasses RLS)
CREATE OR REPLACE FUNCTION public.save_card_capture_via_token(
  _token TEXT,
  _data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
  new_id UUID;
BEGIN
  -- Validate token
  found_user_id := public.validate_quick_access_token(_token);
  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;
  
  -- Verify user is admin
  IF NOT public.has_role(found_user_id, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  INSERT INTO public.crm_card_captures (
    user_id, person_name, job_title, company_name, phone, whatsapp,
    email, website, address, city, state, country, social_links,
    logo_url, contact_type, is_existing_client, geographic_scope,
    supplier_category, notes, event_origin, lead_temperature,
    next_action, capture_origin
  ) VALUES (
    found_user_id,
    _data->>'person_name',
    _data->>'job_title',
    _data->>'company_name',
    _data->>'phone',
    _data->>'whatsapp',
    _data->>'email',
    _data->>'website',
    _data->>'address',
    _data->>'city',
    _data->>'state',
    _data->>'country',
    COALESCE((_data->'social_links')::jsonb, '{}'::jsonb),
    _data->>'logo_url',
    COALESCE(_data->>'contact_type', 'outro'),
    (_data->>'is_existing_client')::boolean,
    _data->>'geographic_scope',
    _data->>'supplier_category',
    _data->>'notes',
    _data->>'event_origin',
    _data->>'lead_temperature',
    _data->>'next_action',
    COALESCE(_data->>'capture_origin', 'cartao_visita')
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_crm_card_captures_updated_at
  BEFORE UPDATE ON public.crm_card_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for duplicate detection
CREATE INDEX idx_card_captures_email ON public.crm_card_captures(email) WHERE email IS NOT NULL;
CREATE INDEX idx_card_captures_phone ON public.crm_card_captures(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_card_captures_company ON public.crm_card_captures(company_name) WHERE company_name IS NOT NULL;
