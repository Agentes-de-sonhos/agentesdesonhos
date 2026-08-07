-- 1) admin_resolve_agency_owner: remove referência a profiles.email (coluna inexistente)
CREATE OR REPLACE FUNCTION public.admin_resolve_agency_owner(_user_id uuid)
RETURNS TABLE(agency_owner_id uuid, agency_name text, owner_name text, owner_email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_owner := public.resolve_agency_id_for_user(_user_id);

  RETURN QUERY
  SELECT v_owner,
         p.agency_name,
         p.name,
         (SELECT u.email::text FROM auth.users u WHERE u.id = v_owner)
  FROM public.profiles p
  WHERE p.user_id = v_owner;

  -- Se não houver perfil, ainda devolve o owner resolvido
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT v_owner,
           NULL::text,
           NULL::text,
           (SELECT u.email::text FROM auth.users u WHERE u.id = v_owner);
  END IF;
END;
$function$;

-- 2) Equipe autorizada da MESMA agência: grupos de escolha
CREATE POLICY "team_quote_choice_groups_select"
ON public.quote_service_choice_groups
FOR SELECT TO authenticated
USING (
  public.can_team('quotes.view')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_choice_groups_insert"
ON public.quote_service_choice_groups
FOR INSERT TO authenticated
WITH CHECK (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_choice_groups_update"
ON public.quote_service_choice_groups
FOR UPDATE TO authenticated
USING (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
)
WITH CHECK (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_choice_groups_delete"
ON public.quote_service_choice_groups
FOR DELETE TO authenticated
USING (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

-- 2b) Equipe autorizada da MESMA agência: serviços do orçamento
CREATE POLICY "team_quote_services_select"
ON public.quote_services
FOR SELECT TO authenticated
USING (
  public.can_team('quotes.view')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_services_insert"
ON public.quote_services
FOR INSERT TO authenticated
WITH CHECK (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_services_update"
ON public.quote_services
FOR UPDATE TO authenticated
USING (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
)
WITH CHECK (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "team_quote_services_delete"
ON public.quote_services
FOR DELETE TO authenticated
USING (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND q.user_id = public.resolve_agency_id_for_user(auth.uid())
  )
);