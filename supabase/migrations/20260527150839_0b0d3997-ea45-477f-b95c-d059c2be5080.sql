
-- =====================================================
-- 1. pipeline_stages table
-- =====================================================
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'slate',
  legacy_key text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_stages_user ON public.pipeline_stages(user_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stages" ON public.pipeline_stages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stages" ON public.pipeline_stages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own stages" ON public.pipeline_stages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own stages" ON public.pipeline_stages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. seed function for default stages
-- =====================================================
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.pipeline_stages (user_id, name, position, color, legacy_key, is_default) VALUES
    (_user_id, 'Novo Contato', 0, 'blue', 'new_contact', true),
    (_user_id, 'Em Atendimento', 1, 'amber', 'in_service', true),
    (_user_id, 'Orçamento em Criação', 2, 'orange', 'quote_creating', true),
    (_user_id, 'Orçamento Enviado', 3, 'violet', 'quote_sent', true),
    (_user_id, 'Negociação / Ajustes', 4, 'rose', 'negotiation', true),
    (_user_id, 'Follow-up', 5, 'sky', 'follow_up', true),
    (_user_id, 'Fechado', 6, 'emerald', 'closed', true),
    (_user_id, 'Perdido / Arquivado', 7, 'slate', 'lost', true);
END;
$$;

-- =====================================================
-- 3. seed for ALL existing users (with profiles)
-- =====================================================
DO $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.profiles WHERE user_id IS NOT NULL
  LOOP
    PERFORM public.seed_default_pipeline_stages(u.user_id);
  END LOOP;
  -- Also any users with opportunities but no profile (edge case)
  FOR u IN SELECT DISTINCT user_id FROM public.opportunities WHERE user_id IS NOT NULL
  LOOP
    PERFORM public.seed_default_pipeline_stages(u.user_id);
  END LOOP;
END $$;

-- =====================================================
-- 4. opportunities.stage_id column + backfill
-- =====================================================
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT;

UPDATE public.opportunities o
SET stage_id = ps.id
FROM public.pipeline_stages ps
WHERE ps.user_id = o.user_id
  AND ps.legacy_key = o.stage
  AND o.stage_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_stage_id ON public.opportunities(stage_id);

-- =====================================================
-- 5. Trigger: prevent deletion of last stage
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_last_stage_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM public.pipeline_stages
  WHERE user_id = OLD.user_id AND id <> OLD.id;
  IF remaining = 0 THEN
    RAISE EXCEPTION 'Não é possível excluir a última coluna do funil.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_stage_deletion
  BEFORE DELETE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_stage_deletion();

-- =====================================================
-- 6. Trigger: auto-seed stages for new users
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_pipeline_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_pipeline_stages(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_pipeline_stages ON auth.users;
CREATE TRIGGER on_auth_user_created_pipeline_stages
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pipeline_stages();

-- =====================================================
-- 7. Trigger: keep legacy text `stage` in sync from stage_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_opportunity_stage_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key text;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT COALESCE(legacy_key, 'new_contact') INTO key
    FROM public.pipeline_stages WHERE id = NEW.stage_id;
    IF key IS NOT NULL THEN
      NEW.stage := key;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_stage_text ON public.opportunities;
CREATE TRIGGER trg_sync_opportunity_stage_text
  BEFORE INSERT OR UPDATE OF stage_id ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_stage_text();
