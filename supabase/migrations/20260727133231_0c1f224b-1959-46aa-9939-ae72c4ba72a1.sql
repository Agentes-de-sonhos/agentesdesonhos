ALTER TABLE public.community_meetings
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IN ('encontro','workshop','palestra','networking','treinamento','especialista','outro'))
    DEFAULT 'encontro';