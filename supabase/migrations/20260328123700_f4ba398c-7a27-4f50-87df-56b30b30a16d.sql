ALTER TABLE public.itineraries
DROP CONSTRAINT IF EXISTS itineraries_trip_type_check;

ALTER TABLE public.itineraries
ADD CONSTRAINT itineraries_trip_type_check
CHECK (
  trip_type = ANY (
    ARRAY[
      'familia'::text,
      'casal'::text,
      'lua_de_mel'::text,
      'sozinho'::text,
      'solo'::text,
      'corporativo'::text,
      'grupo_amigos'::text,
      'familia_crianca_pequena'::text,
      'familia_adolescentes'::text,
      'melhor_idade'::text
    ]
  )
);