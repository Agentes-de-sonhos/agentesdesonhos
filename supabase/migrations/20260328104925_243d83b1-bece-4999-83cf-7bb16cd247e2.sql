
-- =====================================================
-- 1. FIX PROFILES PII EXPOSURE
-- Create a safe public view that excludes sensitive data
-- =====================================================

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    user_id,
    name,
    avatar_url,
    agency_name,
    agency_logo_url,
    city,
    state
  FROM public.profiles;

-- Drop the 3 public-facing SELECT policies that expose full profiles row
DROP POLICY IF EXISTS "Public can view profiles of active showcases" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profile of published itinerary owner" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profile of quote owner" ON public.profiles;

-- Grant anon/authenticated SELECT on the view only
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- =====================================================
-- 2. FIX PERMISSIVE INSERT/UPDATE POLICIES
-- =====================================================

-- client_subcategories: restrict insert to user's own categories
DROP POLICY IF EXISTS "Authenticated can create subcategories" ON public.client_subcategories;
CREATE POLICY "Authenticated can create subcategories" ON public.client_subcategories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_categories cc
      WHERE cc.id = category_id
    )
  );

-- noticias_brutas: restrict to service_role only (was {public})
DROP POLICY IF EXISTS "Service role can insert noticias_brutas" ON public.noticias_brutas;
CREATE POLICY "Service role can insert noticias_brutas" ON public.noticias_brutas
  FOR INSERT TO service_role
  WITH CHECK (true);
