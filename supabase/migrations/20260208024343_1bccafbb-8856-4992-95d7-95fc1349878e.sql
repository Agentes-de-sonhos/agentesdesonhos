-- Create table for user-defined custom event types
CREATE TABLE public.custom_event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_event_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_event_types
CREATE POLICY "Users can view their own custom event types"
ON public.custom_event_types
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom event types"
ON public.custom_event_types
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom event types"
ON public.custom_event_types
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom event types"
ON public.custom_event_types
FOR DELETE
USING (auth.uid() = user_id);

-- Create table for user filter preferences (which event types to show/hide)
CREATE TABLE public.agenda_filter_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  hidden_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agenda_filter_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for agenda_filter_preferences
CREATE POLICY "Users can view their own filter preferences"
ON public.agenda_filter_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own filter preferences"
ON public.agenda_filter_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter preferences"
ON public.agenda_filter_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add new event types to preset_events for admin global events
-- Update existing preset_events to include is_global flag (using recurring_yearly as proxy for now)
-- Add more default event type options

-- Insert additional preset event types for the trade calendar
-- These are examples - admin can add more via the admin interface
INSERT INTO public.preset_events (title, description, event_type, event_date, recurring_yearly, color, is_active) VALUES
('Dia do Turismo', 'Dia Mundial do Turismo', 'comemorativo', '2026-09-27', true, '#ec4899', true),
('ABAV Expo', 'Maior feira de turismo do Brasil', 'trade', '2026-09-23', true, '#3b82f6', true),
('WTM Latin America', 'World Travel Market América Latina', 'trade', '2026-04-07', true, '#3b82f6', true),
('Festival de Turismo', 'Festival Brasileiro de Turismo', 'trade', '2026-06-15', true, '#3b82f6', true),
('Dia do Agente de Viagens', 'Homenagem aos agentes de viagens', 'comemorativo', '2026-05-16', true, '#ec4899', true)
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at on custom_event_types
CREATE TRIGGER update_custom_event_types_updated_at
BEFORE UPDATE ON public.custom_event_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on agenda_filter_preferences
CREATE TRIGGER update_agenda_filter_preferences_updated_at
BEFORE UPDATE ON public.agenda_filter_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();