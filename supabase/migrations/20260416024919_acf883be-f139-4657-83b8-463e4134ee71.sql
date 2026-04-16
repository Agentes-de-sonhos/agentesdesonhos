-- 1. Add user_id column to tour_operators
ALTER TABLE public.tour_operators ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_tour_operators_user_id ON public.tour_operators(user_id);

-- 3. Drop existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tour_operators' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tour_operators', pol.policyname);
  END LOOP;
END $$;

-- 4. Enable RLS
ALTER TABLE public.tour_operators ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Authenticated can view active operators"
  ON public.tour_operators FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

CREATE POLICY "Admins full access to operators"
  ON public.tour_operators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Fornecedor can update own operator"
  ON public.tour_operators FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'fornecedor'::app_role))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'fornecedor'::app_role));