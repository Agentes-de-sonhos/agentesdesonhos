
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sorteio',
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own raffles" ON public.raffles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.raffle_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_name TEXT NOT NULL,
  winner_data JSONB,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own winners" ON public.raffle_winners
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_raffle_winners_raffle ON public.raffle_winners(raffle_id, drawn_at DESC);
CREATE INDEX idx_raffles_user ON public.raffles(user_id, created_at DESC);

CREATE TRIGGER update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
