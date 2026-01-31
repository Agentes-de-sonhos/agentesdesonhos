-- Create enum for workshop categories
CREATE TYPE public.workshop_category AS ENUM ('contabilidade', 'tributaria', 'impostos', 'juridico', 'gestao');

-- Fun Trips & Exclusive Opportunities
CREATE TABLE public.fun_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  trip_date DATE NOT NULL,
  available_spots INTEGER NOT NULL DEFAULT 0,
  partner_company TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  registration_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Online Weekly Meetings
CREATE TABLE public.online_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  meeting_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_url TEXT,
  recording_url TEXT,
  is_past BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- In-Person Monthly Events
CREATE TABLE public.in_person_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  location TEXT NOT NULL,
  theme TEXT NOT NULL,
  event_date DATE NOT NULL,
  registration_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Professional Workshops
CREATE TABLE public.professional_workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category workshop_category NOT NULL,
  description TEXT,
  video_url TEXT,
  materials_url TEXT,
  instructor TEXT,
  duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Paid Training Opportunities
CREATE TABLE public.paid_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  partner_company TEXT NOT NULL,
  compensation TEXT NOT NULL,
  description TEXT,
  apply_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community Highlights (Monthly nominees)
CREATE TABLE public.community_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  contribution_summary TEXT NOT NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Community Votes
CREATE TABLE public.community_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID NOT NULL,
  highlight_id UUID NOT NULL REFERENCES public.community_highlights(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voter_id, month, year)
);

-- WhatsApp Community Settings (singleton for admin config)
CREATE TABLE public.whatsapp_community (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_url TEXT NOT NULL,
  benefits TEXT[],
  rules TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly Prizes
CREATE TABLE public.monthly_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  prize_name TEXT NOT NULL,
  prize_description TEXT,
  prize_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Enable RLS on all tables
ALTER TABLE public.fun_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_person_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_community ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_prizes ENABLE ROW LEVEL SECURITY;

-- Public read access for all community content tables (viewable by authenticated users)
CREATE POLICY "Authenticated users can view fun trips"
ON public.fun_trips FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view online meetings"
ON public.online_meetings FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view in-person events"
ON public.in_person_events FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view workshops"
ON public.professional_workshops FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view paid trainings"
ON public.paid_trainings FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view community highlights"
ON public.community_highlights FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can vote once per month"
ON public.community_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can view all votes"
ON public.community_votes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view WhatsApp community"
ON public.whatsapp_community FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view monthly prizes"
ON public.monthly_prizes FOR SELECT TO authenticated
USING (is_active = true);

-- Admin policies for all tables
CREATE POLICY "Admins can manage fun trips"
ON public.fun_trips FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage online meetings"
ON public.online_meetings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage in-person events"
ON public.in_person_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage workshops"
ON public.professional_workshops FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage paid trainings"
ON public.paid_trainings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage community highlights"
ON public.community_highlights FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage WhatsApp community"
ON public.whatsapp_community FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage monthly prizes"
ON public.monthly_prizes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user has won this year
CREATE OR REPLACE FUNCTION public.has_won_this_year(_user_id UUID, _year INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_highlights
    WHERE user_id = _user_id
      AND year = _year
      AND is_winner = true
  )
$$;

-- Function to check if user already voted this month
CREATE OR REPLACE FUNCTION public.has_voted_this_month(_user_id UUID, _month INTEGER, _year INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_votes
    WHERE voter_id = _user_id
      AND month = _month
      AND year = _year
  )
$$;

-- Trigger to update vote count
CREATE OR REPLACE FUNCTION public.update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_highlights
  SET vote_count = vote_count + 1, updated_at = now()
  WHERE id = NEW.highlight_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_inserted
AFTER INSERT ON public.community_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_vote_count();

-- Trigger for updated_at timestamps
CREATE TRIGGER update_fun_trips_updated_at
BEFORE UPDATE ON public.fun_trips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_online_meetings_updated_at
BEFORE UPDATE ON public.online_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_in_person_events_updated_at
BEFORE UPDATE ON public.in_person_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_workshops_updated_at
BEFORE UPDATE ON public.professional_workshops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_trainings_updated_at
BEFORE UPDATE ON public.paid_trainings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_highlights_updated_at
BEFORE UPDATE ON public.community_highlights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();