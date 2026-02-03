-- =============================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- =============================================

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create strict RLS policies for profiles
-- Users can only view their own profile, admins can view all
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile, admins can update any
CREATE POLICY "Users can update own profile or admin can update all"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- FIX RLS POLICIES FOR SALES TABLE
-- =============================================

-- Drop existing policies on sales
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

-- Create strict RLS policies for sales
-- Users can only view their own sales, admins can view all
CREATE POLICY "Users can view own sales or admin can view all"
ON public.sales
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only create their own sales
CREATE POLICY "Users can create their own sales"
ON public.sales
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sales
CREATE POLICY "Users can update their own sales"
ON public.sales
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own sales
CREATE POLICY "Users can delete their own sales"
ON public.sales
FOR DELETE
USING (auth.uid() = user_id);