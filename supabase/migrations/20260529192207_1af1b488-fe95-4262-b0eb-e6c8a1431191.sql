ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS recurrence_end_type text NOT NULL DEFAULT 'indefinite',
  ADD COLUMN IF NOT EXISTS recurrence_end_date date,
  ADD COLUMN IF NOT EXISTS recurrence_occurrences integer;

ALTER TABLE public.expense_entries
  DROP CONSTRAINT IF EXISTS expense_recurrence_end_type_chk;
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_recurrence_end_type_chk
  CHECK (recurrence_end_type IN ('indefinite','until_date','occurrences'));