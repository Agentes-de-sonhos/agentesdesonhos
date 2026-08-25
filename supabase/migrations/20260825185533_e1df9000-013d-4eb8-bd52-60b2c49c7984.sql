-- Identifica registros pertencentes à agência do master autenticado.
-- Um registro pode estar no user_id do titular ou, em dados legados, no auth user_id de um colaborador vinculado à mesma agência.
CREATE OR REPLACE FUNCTION public.agency_master_record_visible(_record_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency uuid;
  _role text;
BEGIN
  IF auth.uid() IS NULL OR _record_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Colaboradores nunca recebem visão master por esta função.
  IF public.is_team_subuser(auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT m.agency_id, m.role
    INTO _agency, _role
    FROM public.agency_membership m
   WHERE m.user_id = auth.uid();

  -- Contas antigas sem membership explícita continuam sendo tratadas como titulares da própria agência.
  IF _agency IS NULL THEN
    _agency := auth.uid();
    _role := 'master';
  END IF;

  IF _role <> 'master' THEN
    RETURN false;
  END IF;

  -- O registro pertence à agência quando está no titular ou em um colaborador vinculado à mesma agency_id.
  RETURN _record_user_id = _agency
    OR EXISTS (
      SELECT 1
        FROM public.agency_membership target
       WHERE target.user_id = _record_user_id
         AND target.agency_id = _agency
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agency_master_record_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_master_record_visible(uuid) TO authenticated, service_role;

-- Projetos principais: orçamentos, carteiras digitais e roteiros.
DROP POLICY IF EXISTS master_agency_quotes_all ON public.quotes;
CREATE POLICY master_agency_quotes_all ON public.quotes
  FOR ALL TO authenticated
  USING (public.agency_master_record_visible(user_id))
  WITH CHECK (public.agency_master_record_visible(user_id));

DROP POLICY IF EXISTS master_agency_trips_all ON public.trips;
CREATE POLICY master_agency_trips_all ON public.trips
  FOR ALL TO authenticated
  USING (public.agency_master_record_visible(user_id))
  WITH CHECK (public.agency_master_record_visible(user_id));

DROP POLICY IF EXISTS master_agency_itineraries_all ON public.itineraries;
CREATE POLICY master_agency_itineraries_all ON public.itineraries
  FOR ALL TO authenticated
  USING (public.agency_master_record_visible(user_id))
  WITH CHECK (public.agency_master_record_visible(user_id));

-- Conteúdo interno de orçamentos.
DROP POLICY IF EXISTS master_agency_quote_services_all ON public.quote_services;
CREATE POLICY master_agency_quote_services_all ON public.quote_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_services.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ));

DROP POLICY IF EXISTS master_agency_quote_sections_all ON public.quote_sections;
CREATE POLICY master_agency_quote_sections_all ON public.quote_sections
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_sections.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_sections.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ));

DROP POLICY IF EXISTS master_agency_quote_documents_all ON public.quote_documents;
CREATE POLICY master_agency_quote_documents_all ON public.quote_documents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_documents.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_documents.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ));

DROP POLICY IF EXISTS master_agency_quote_entry_extras_all ON public.quote_entry_extras;
CREATE POLICY master_agency_quote_entry_extras_all ON public.quote_entry_extras
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_entry_extras.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_entry_extras.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ));

DROP POLICY IF EXISTS master_agency_quote_choice_groups_all ON public.quote_service_choice_groups;
CREATE POLICY master_agency_quote_choice_groups_all ON public.quote_service_choice_groups
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_service_choice_groups.quote_id
      AND public.agency_master_record_visible(q.user_id)
  ));

-- Conteúdo interno das carteiras digitais.
DROP POLICY IF EXISTS master_agency_trip_services_all ON public.trip_services;
CREATE POLICY master_agency_trip_services_all ON public.trip_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_services.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_services.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ));

DROP POLICY IF EXISTS master_agency_trip_edit_history_all ON public.trip_edit_history;
CREATE POLICY master_agency_trip_edit_history_all ON public.trip_edit_history
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_edit_history.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_edit_history.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ));

DROP POLICY IF EXISTS master_agency_trip_itinerary_activities_all ON public.trip_itinerary_activities;
CREATE POLICY master_agency_trip_itinerary_activities_all ON public.trip_itinerary_activities
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_itinerary_activities.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_itinerary_activities.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ));

DROP POLICY IF EXISTS master_agency_trip_period_images_all ON public.trip_itinerary_period_images;
CREATE POLICY master_agency_trip_period_images_all ON public.trip_itinerary_period_images
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_itinerary_period_images.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_itinerary_period_images.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ));

DROP POLICY IF EXISTS master_agency_trip_reminders_all ON public.trip_reminders;
CREATE POLICY master_agency_trip_reminders_all ON public.trip_reminders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_reminders.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_reminders.trip_id
      AND public.agency_master_record_visible(t.user_id)
  ));

-- Conteúdo interno dos roteiros.
DROP POLICY IF EXISTS master_agency_itinerary_days_all ON public.itinerary_days;
CREATE POLICY master_agency_itinerary_days_all ON public.itinerary_days
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.id = itinerary_days.itinerary_id
      AND public.agency_master_record_visible(i.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.id = itinerary_days.itinerary_id
      AND public.agency_master_record_visible(i.user_id)
  ));

DROP POLICY IF EXISTS master_agency_itinerary_activities_all ON public.itinerary_activities;
CREATE POLICY master_agency_itinerary_activities_all ON public.itinerary_activities
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
    WHERE d.id = itinerary_activities.day_id
      AND public.agency_master_record_visible(i.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
      FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
    WHERE d.id = itinerary_activities.day_id
      AND public.agency_master_record_visible(i.user_id)
  ));

DROP POLICY IF EXISTS master_agency_itinerary_period_images_all ON public.itinerary_period_images;
CREATE POLICY master_agency_itinerary_period_images_all ON public.itinerary_period_images
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.id = itinerary_period_images.itinerary_id
      AND public.agency_master_record_visible(i.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.itineraries i
    WHERE i.id = itinerary_period_images.itinerary_id
      AND public.agency_master_record_visible(i.user_id)
  ));