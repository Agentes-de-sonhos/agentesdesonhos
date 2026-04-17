-- 1. Add label column for card identification
ALTER TABLE public.business_cards 
ADD COLUMN IF NOT EXISTS label TEXT;

-- 2. Add index for faster per-user listing
CREATE INDEX IF NOT EXISTS idx_business_cards_user_id 
ON public.business_cards(user_id);

-- 3. Backend enforcement: max 3 cards per user
CREATE OR REPLACE FUNCTION public.enforce_business_card_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  card_count INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO card_count
  FROM public.business_cards
  WHERE user_id = NEW.user_id;

  IF card_count >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 cartões virtuais por usuário atingido'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_card_limit ON public.business_cards;
CREATE TRIGGER trg_enforce_business_card_limit
BEFORE INSERT ON public.business_cards
FOR EACH ROW
EXECUTE FUNCTION public.enforce_business_card_limit();

-- 4. Backfill default labels for existing cards (per-user numbering)
WITH ranked AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM public.business_cards
  WHERE label IS NULL OR label = ''
)
UPDATE public.business_cards bc
SET label = CASE 
  WHEN ranked.rn = 1 THEN 'Cartão principal'
  ELSE 'Cartão ' || ranked.rn
END
FROM ranked
WHERE bc.id = ranked.id;