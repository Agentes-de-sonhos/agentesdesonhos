-- Meetings
CREATE TABLE public.community_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  short_description TEXT,
  description TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'online' CHECK (meeting_type IN ('online','presential','hybrid')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','live','completed','cancelled')),
  cover_image_url TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  location_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  maps_url TEXT,
  meeting_platform TEXT,
  meeting_url TEXT,
  registration_url TEXT,
  capacity INTEGER,
  organizer_name TEXT,
  speakers JSONB DEFAULT '[]'::jsonb,
  agenda JSONB DEFAULT '[]'::jsonb,
  recording_url TEXT,
  is_recording_available BOOLEAN NOT NULL DEFAULT false,
  photos JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  related_links JSONB DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_meetings TO authenticated;
GRANT ALL ON public.community_meetings TO service_role;

ALTER TABLE public.community_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published meetings"
ON public.community_meetings FOR SELECT
TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage meetings"
ON public.community_meetings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_community_meetings_start_at ON public.community_meetings(start_at);
CREATE INDEX idx_community_meetings_status ON public.community_meetings(status);
CREATE INDEX idx_community_meetings_published ON public.community_meetings(published);

CREATE TRIGGER update_community_meetings_updated_at
BEFORE UPDATE ON public.community_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attendees
CREATE TABLE public.community_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.community_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','maybe','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_meeting_attendees TO authenticated;
GRANT ALL ON public.community_meeting_attendees TO service_role;

ALTER TABLE public.community_meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view attendees"
ON public.community_meeting_attendees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own attendance"
ON public.community_meeting_attendees FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_community_meeting_attendees_updated_at
BEFORE UPDATE ON public.community_meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();