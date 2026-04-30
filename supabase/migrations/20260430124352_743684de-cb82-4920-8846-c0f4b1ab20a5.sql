-- ===== Sales Landings (Páginas de Vendas Personalizadas) =====

CREATE TABLE public.sales_landings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  subheadline TEXT,
  description TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Quero saber mais',
  image_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0f766e',
  agent_whatsapp TEXT NOT NULL,
  agent_name TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_landings_user_id ON public.sales_landings(user_id);
CREATE INDEX idx_sales_landings_slug ON public.sales_landings(slug);

ALTER TABLE public.sales_landings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own landings"
  ON public.sales_landings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sales_landings_updated_at
  BEFORE UPDATE ON public.sales_landings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Views tracking (simple, by session/day) =====

CREATE TABLE public.sales_landing_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES public.sales_landings(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(landing_id, session_hash, viewed_date)
);

CREATE INDEX idx_sales_landing_views_landing ON public.sales_landing_views(landing_id);

ALTER TABLE public.sales_landing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own views"
  ON public.sales_landing_views
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales_landings l
    WHERE l.id = landing_id AND l.user_id = auth.uid()
  ));

-- ===== Leads captured =====

CREATE TABLE public.sales_landing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id UUID NOT NULL REFERENCES public.sales_landings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_landing_leads_user ON public.sales_landing_leads(user_id);
CREATE INDEX idx_sales_landing_leads_landing ON public.sales_landing_leads(landing_id);

ALTER TABLE public.sales_landing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own leads"
  ON public.sales_landing_leads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner deletes own leads"
  ON public.sales_landing_leads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== Plan limit enforcement (BEFORE INSERT trigger) =====

CREATE OR REPLACE FUNCTION public.enforce_sales_landing_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
  monthly_count INTEGER;
  monthly_limit INTEGER;
BEGIN
  user_plan := public.get_user_plan(NEW.user_id);

  -- Premium / Fundador: ilimitado
  IF user_plan IN ('premium', 'fundador') THEN
    RETURN NEW;
  END IF;

  -- Profissional: 2 por mês
  IF user_plan = 'profissional' THEN
    monthly_limit := 2;
    SELECT COUNT(*) INTO monthly_count
    FROM public.sales_landings
    WHERE user_id = NEW.user_id
      AND created_at >= date_trunc('month', now());

    IF monthly_count >= monthly_limit THEN
      RAISE EXCEPTION 'Limite de % páginas de vendas por mês atingido. Faça upgrade para o plano Premium para criar páginas ilimitadas.', monthly_limit
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- Outros planos (start, essencial etc): bloqueado
  RAISE EXCEPTION 'Páginas de Vendas Personalizadas estão disponíveis apenas nos planos Profissional e Premium.'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_enforce_sales_landing_quota
  BEFORE INSERT ON public.sales_landings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sales_landing_quota();

-- ===== Public RPC: get landing by slug (SECURITY DEFINER, sanitized) =====

CREATE OR REPLACE FUNCTION public.get_public_sales_landing(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landing_record RECORD;
BEGIN
  IF p_slug IS NULL OR length(p_slug) < 1 OR length(p_slug) > 80 THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  SELECT * INTO landing_record
  FROM public.sales_landings
  WHERE slug = p_slug AND is_active = true;

  IF landing_record IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  RETURN json_build_object(
    'id', landing_record.id,
    'slug', landing_record.slug,
    'headline', landing_record.headline,
    'subheadline', landing_record.subheadline,
    'description', landing_record.description,
    'cta_text', landing_record.cta_text,
    'image_url', landing_record.image_url,
    'primary_color', landing_record.primary_color,
    'agent_name', landing_record.agent_name
  );
END;
$$;

-- ===== Public RPC: track landing view (idempotent per session/day) =====

CREATE OR REPLACE FUNCTION public.track_sales_landing_view(p_slug TEXT, p_session_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landing_record RECORD;
  inserted BOOLEAN := false;
BEGIN
  IF p_slug IS NULL OR p_session_hash IS NULL OR length(p_session_hash) > 128 THEN
    RETURN;
  END IF;

  SELECT id INTO landing_record FROM public.sales_landings
  WHERE slug = p_slug AND is_active = true;
  IF landing_record IS NULL THEN RETURN; END IF;

  INSERT INTO public.sales_landing_views (landing_id, session_hash, viewed_date)
  VALUES (landing_record.id, p_session_hash, CURRENT_DATE)
  ON CONFLICT (landing_id, session_hash, viewed_date) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted THEN
    UPDATE public.sales_landings
    SET views_count = views_count + 1
    WHERE id = landing_record.id;
  END IF;
END;
$$;

-- ===== Public RPC: submit lead (creates client + opportunity + lead) =====

CREATE OR REPLACE FUNCTION public.submit_sales_landing_lead(
  p_slug TEXT,
  p_lead_name TEXT,
  p_lead_phone TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landing_record RECORD;
  v_client_id UUID;
  v_opportunity_id UUID;
  v_existing_client RECORD;
  clean_name TEXT;
  clean_phone TEXT;
BEGIN
  -- Sanitize
  clean_name := trim(coalesce(p_lead_name, ''));
  clean_phone := trim(coalesce(p_lead_phone, ''));

  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN
    RETURN json_build_object('error', 'Nome inválido');
  END IF;
  IF length(clean_phone) < 8 OR length(clean_phone) > 30 THEN
    RETURN json_build_object('error', 'WhatsApp inválido');
  END IF;
  IF p_slug IS NULL OR length(p_slug) < 1 OR length(p_slug) > 80 THEN
    RETURN json_build_object('error', 'Página inválida');
  END IF;

  SELECT * INTO landing_record
  FROM public.sales_landings
  WHERE slug = p_slug AND is_active = true;
  IF landing_record IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  -- Reuse client if same phone exists for this user
  SELECT id INTO v_existing_client
  FROM public.clients
  WHERE user_id = landing_record.user_id AND phone = clean_phone
  LIMIT 1;

  IF v_existing_client.id IS NOT NULL THEN
    v_client_id := v_existing_client.id;
  ELSE
    INSERT INTO public.clients (user_id, name, phone, status, internal_notes)
    VALUES (
      landing_record.user_id,
      clean_name,
      clean_phone,
      'lead',
      'Origem: Página de Vendas - ' || landing_record.headline
    )
    RETURNING id INTO v_client_id;
  END IF;

  -- Create opportunity in the first stage (new_contact = "Leads")
  INSERT INTO public.opportunities (
    user_id, client_id, destination, estimated_value,
    passengers_count, adults_count, children_count, stage, notes
  )
  VALUES (
    landing_record.user_id,
    v_client_id,
    landing_record.headline,
    0,
    1, 1, 0,
    'new_contact',
    'Lead capturado via Página de Vendas: ' || landing_record.headline
  )
  RETURNING id INTO v_opportunity_id;

  -- Register lead
  INSERT INTO public.sales_landing_leads (
    landing_id, user_id, client_id, opportunity_id, lead_name, lead_phone
  )
  VALUES (
    landing_record.id, landing_record.user_id, v_client_id, v_opportunity_id,
    clean_name, clean_phone
  );

  -- Increment counter
  UPDATE public.sales_landings
  SET leads_count = leads_count + 1
  WHERE id = landing_record.id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', 'Não foi possível registrar seu contato. Tente novamente.');
END;
$$;