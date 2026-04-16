-- Add approval_status column with default 'approved' for existing records
ALTER TABLE public.tour_operators 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Add rejection_reason column
ALTER TABLE public.tour_operators 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_tour_operators_approval_status ON public.tour_operators(approval_status);
