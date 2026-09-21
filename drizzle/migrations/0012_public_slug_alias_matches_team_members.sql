-- Aditivo: aceita também o endereço público (slug) da agência quando o
-- registro público foi criado por um integrante ativo da equipe dessa agência.
-- Preserva o isolamento: só a própria agência do integrante é considerada.
CREATE OR REPLACE FUNCTION public.public_slug_alias_matches(p_user_id uuid, p_agency_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id IN (
        SELECT p_user_id
        UNION
        SELECT m.agency_id
        FROM public.agency_team_members m
        WHERE m.auth_user_id = p_user_id
          AND m.status = 'active'
      )
      AND (
        trim(both '-' from regexp_replace(regexp_replace(lower(public.unaccent(COALESCE(p.agency_name, ''))), '[^a-z0-9\-]', '-', 'g'), '-+', '-', 'g')) = lower(COALESCE(p_agency_slug, ''))
        OR lower(COALESCE(p.public_slug, '')) = lower(COALESCE(p_agency_slug, ''))
      )
  )
$$;
