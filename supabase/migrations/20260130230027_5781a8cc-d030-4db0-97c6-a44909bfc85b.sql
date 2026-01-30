-- Create itineraries table (roteiros)
CREATE TABLE public.itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  travelers_count INTEGER NOT NULL DEFAULT 1,
  trip_type TEXT NOT NULL CHECK (trip_type IN ('familia', 'casal', 'lua_de_mel', 'sozinho', 'corporativo')),
  budget_level TEXT NOT NULL CHECK (budget_level IN ('economico', 'conforto', 'luxo')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'review', 'approved', 'published')),
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create itinerary days table (dias do roteiro)
CREATE TABLE public.itinerary_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(itinerary_id, day_number)
);

-- Create activities table (atividades)
CREATE TABLE public.itinerary_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('manha', 'tarde', 'noite')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  estimated_duration TEXT,
  estimated_cost TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;

-- Itineraries policies
CREATE POLICY "Users can view their own itineraries"
  ON public.itineraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own itineraries"
  ON public.itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries"
  ON public.itineraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries"
  ON public.itineraries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view published itineraries by share token"
  ON public.itineraries FOR SELECT
  USING (status = 'published' AND share_token IS NOT NULL);

-- Itinerary days policies
CREATE POLICY "Users can manage days of their itineraries"
  ON public.itinerary_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE itineraries.id = itinerary_days.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view days of published itineraries"
  ON public.itinerary_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE itineraries.id = itinerary_days.itinerary_id
      AND itineraries.status = 'published'
      AND itineraries.share_token IS NOT NULL
    )
  );

-- Activities policies
CREATE POLICY "Users can manage activities of their itineraries"
  ON public.itinerary_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days
      JOIN public.itineraries ON itineraries.id = itinerary_days.itinerary_id
      WHERE itinerary_days.id = itinerary_activities.day_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view activities of published itineraries"
  ON public.itinerary_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days
      JOIN public.itineraries ON itineraries.id = itinerary_days.itinerary_id
      WHERE itinerary_days.id = itinerary_activities.day_id
      AND itineraries.status = 'published'
      AND itineraries.share_token IS NOT NULL
    )
  );

-- Indexes for performance
CREATE INDEX idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX idx_itineraries_share_token ON public.itineraries(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);
CREATE INDEX idx_itinerary_activities_day_id ON public.itinerary_activities(day_id);

-- Triggers for updated_at
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itinerary_days_updated_at
  BEFORE UPDATE ON public.itinerary_days
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itinerary_activities_updated_at
  BEFORE UPDATE ON public.itinerary_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();