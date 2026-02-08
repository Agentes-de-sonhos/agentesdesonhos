-- Create agency_events table for user-created events
CREATE TABLE public.agency_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'compromisso',
  event_date DATE NOT NULL,
  event_time TIME,
  color TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create preset_events table for holidays, trade events, etc. (admin-managed)
CREATE TABLE public.preset_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'feriado',
  event_date DATE NOT NULL,
  recurring_yearly BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hidden_preset_events table to track which preset events users have hidden
CREATE TABLE public.hidden_preset_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preset_event_id UUID NOT NULL REFERENCES public.preset_events(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preset_event_id)
);

-- Enable RLS on all tables
ALTER TABLE public.agency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_preset_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for agency_events (user can only see/manage their own events)
CREATE POLICY "Users can view their own agency events"
  ON public.agency_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agency events"
  ON public.agency_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency events"
  ON public.agency_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agency events"
  ON public.agency_events FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for preset_events (all authenticated users can view active preset events)
CREATE POLICY "All users can view active preset events"
  ON public.preset_events FOR SELECT
  USING (is_active = true);

-- RLS policies for hidden_preset_events (users can manage their own hidden events)
CREATE POLICY "Users can view their own hidden preset events"
  ON public.hidden_preset_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can hide preset events"
  ON public.hidden_preset_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide preset events"
  ON public.hidden_preset_events FOR DELETE
  USING (auth.uid() = user_id);

-- Create update trigger for agency_events
CREATE TRIGGER update_agency_events_updated_at
  BEFORE UPDATE ON public.agency_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for preset_events
CREATE TRIGGER update_preset_events_updated_at
  BEFORE UPDATE ON public.preset_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Brazilian holidays and important tourism dates for 2025 and 2026
INSERT INTO public.preset_events (title, description, event_type, event_date, recurring_yearly, color) VALUES
-- Feriados Nacionais 2025
('Confraternização Universal', 'Feriado nacional', 'feriado', '2025-01-01', true, '#ef4444'),
('Carnaval', 'Feriado nacional', 'feriado', '2025-03-03', false, '#f97316'),
('Carnaval', 'Feriado nacional', 'feriado', '2025-03-04', false, '#f97316'),
('Sexta-feira Santa', 'Feriado nacional', 'feriado', '2025-04-18', false, '#ef4444'),
('Tiradentes', 'Feriado nacional', 'feriado', '2025-04-21', true, '#ef4444'),
('Dia do Trabalho', 'Feriado nacional', 'feriado', '2025-05-01', true, '#ef4444'),
('Corpus Christi', 'Feriado nacional', 'feriado', '2025-06-19', false, '#ef4444'),
('Independência do Brasil', 'Feriado nacional', 'feriado', '2025-09-07', true, '#ef4444'),
('Nossa Senhora Aparecida', 'Feriado nacional', 'feriado', '2025-10-12', true, '#ef4444'),
('Finados', 'Feriado nacional', 'feriado', '2025-11-02', true, '#ef4444'),
('Proclamação da República', 'Feriado nacional', 'feriado', '2025-11-15', true, '#ef4444'),
('Natal', 'Feriado nacional', 'feriado', '2025-12-25', true, '#ef4444'),
-- Feriados Nacionais 2026
('Confraternização Universal', 'Feriado nacional', 'feriado', '2026-01-01', false, '#ef4444'),
('Carnaval', 'Feriado nacional', 'feriado', '2026-02-16', false, '#f97316'),
('Carnaval', 'Feriado nacional', 'feriado', '2026-02-17', false, '#f97316'),
('Sexta-feira Santa', 'Feriado nacional', 'feriado', '2026-04-03', false, '#ef4444'),
('Tiradentes', 'Feriado nacional', 'feriado', '2026-04-21', false, '#ef4444'),
('Dia do Trabalho', 'Feriado nacional', 'feriado', '2026-05-01', false, '#ef4444'),
('Corpus Christi', 'Feriado nacional', 'feriado', '2026-06-04', false, '#ef4444'),
('Independência do Brasil', 'Feriado nacional', 'feriado', '2026-09-07', false, '#ef4444'),
('Nossa Senhora Aparecida', 'Feriado nacional', 'feriado', '2026-10-12', false, '#ef4444'),
('Finados', 'Feriado nacional', 'feriado', '2026-11-02', false, '#ef4444'),
('Proclamação da República', 'Feriado nacional', 'feriado', '2026-11-15', false, '#ef4444'),
('Natal', 'Feriado nacional', 'feriado', '2026-12-25', false, '#ef4444'),
-- Datas Comemorativas
('Dia das Mães', 'Data comemorativa', 'comemorativo', '2025-05-11', false, '#ec4899'),
('Dia dos Namorados', 'Data comemorativa', 'comemorativo', '2025-06-12', true, '#ec4899'),
('Dia dos Pais', 'Data comemorativa', 'comemorativo', '2025-08-10', false, '#ec4899'),
('Dia das Crianças', 'Data comemorativa', 'comemorativo', '2025-10-12', false, '#ec4899'),
('Dia das Mães', 'Data comemorativa', 'comemorativo', '2026-05-10', false, '#ec4899'),
('Dia dos Pais', 'Data comemorativa', 'comemorativo', '2026-08-09', false, '#ec4899'),
-- Eventos do Turismo
('ABAV Expo', 'Maior feira de turismo do Brasil', 'trade', '2025-09-24', false, '#3b82f6'),
('WTM Latin America', 'World Travel Market Latin America', 'trade', '2025-04-01', false, '#3b82f6'),
('Festuris Gramado', 'Festival de Turismo de Gramado', 'trade', '2025-11-06', false, '#3b82f6'),
('BTM Campinas', 'Business Travel Market', 'trade', '2025-08-20', false, '#3b82f6');

-- Create indexes for better performance
CREATE INDEX idx_agency_events_user_id ON public.agency_events(user_id);
CREATE INDEX idx_agency_events_event_date ON public.agency_events(event_date);
CREATE INDEX idx_preset_events_event_date ON public.preset_events(event_date);
CREATE INDEX idx_hidden_preset_events_user_id ON public.hidden_preset_events(user_id);