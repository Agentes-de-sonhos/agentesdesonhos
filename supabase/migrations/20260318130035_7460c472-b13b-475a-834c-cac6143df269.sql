
-- Table to store each agent's lead capture form config
CREATE TABLE public.lead_capture_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  welcome_message text DEFAULT 'Olá! 👋 Que bom ter você aqui. Vou te ajudar a planejar sua próxima viagem dos sonhos!',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Table to store captured leads
CREATE TABLE public.lead_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE,
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  destination text,
  travel_dates text,
  travelers_count text,
  budget text,
  additional_info text,
  ai_suggestion text,
  whatsapp_message text,
  status text DEFAULT 'novo',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_capture_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own forms
CREATE POLICY "Users manage own forms" ON public.lead_capture_forms
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public can read active forms (for the wizard page)
CREATE POLICY "Public read active forms" ON public.lead_capture_forms
  FOR SELECT TO anon
  USING (is_active = true);

-- Public can insert leads (anon users filling the form)
CREATE POLICY "Anon can insert leads" ON public.lead_captures
  FOR INSERT TO anon
  WITH CHECK (true);

-- Agents can read their own leads
CREATE POLICY "Agents read own leads" ON public.lead_captures
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_user_id);

-- Agents can update their own leads (mark as read, change status)
CREATE POLICY "Agents update own leads" ON public.lead_captures
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_user_id)
  WITH CHECK (auth.uid() = agent_user_id);

-- Agents can delete their own leads
CREATE POLICY "Agents delete own leads" ON public.lead_captures
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_user_id);

-- Enable realtime for new lead notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_captures;
