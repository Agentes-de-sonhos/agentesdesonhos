
-- Add Trade Connect profile fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS years_in_business integer;

-- Create connections table
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

-- Enable RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own connections
CREATE POLICY "Users can view own connections" ON public.connections
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- RLS: Users can insert connection requests
CREATE POLICY "Users can create connection requests" ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- RLS: Users can update connections they received (accept/reject)
CREATE POLICY "Users can update received connections" ON public.connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- RLS: Users can delete their own connections
CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Trigger to update updated_at
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
