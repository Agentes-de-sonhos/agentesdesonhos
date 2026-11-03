DO $migration$
DECLARE
  function_signature text;
  definition text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.get_trip_by_public_code(text,text)',
    'public.verify_trip_by_public_code(text,text,text)'
  ] LOOP
    definition := pg_get_functiondef(to_regprocedure(function_signature));
    IF definition IS NULL OR position('public.public_slug_alias_matches(trip_record.user_id, p_agency_slug)' IN definition) = 0 THEN
      RAISE EXCEPTION 'Expected wallet owner slug gate missing: %', function_signature;
    END IF;
    definition := replace(definition,
      'public.public_slug_alias_matches(trip_record.user_id, p_agency_slug)',
      '(public.public_slug_alias_matches(trip_record.user_id, p_agency_slug) OR public.agency_public_slug_matches(trip_record.user_id, p_agency_slug))');
    EXECUTE definition;
  END LOOP;
END;
$migration$;