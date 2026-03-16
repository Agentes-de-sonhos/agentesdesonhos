import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const flightNumber = url.searchParams.get('flight_number');
    const flightDate = url.searchParams.get('flight_date');

    if (!flightNumber) {
      return new Response(JSON.stringify({ error: 'flight_number is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('AVIATIONSTACK_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AVIATIONSTACK_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AviationStack free plan only supports HTTP
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightNumber.toUpperCase(),
    });
    if (flightDate) {
      params.set('flight_date', flightDate);
    }

    const apiUrl = `http://api.aviationstack.com/v1/flights?${params.toString()}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || 'AviationStack API error';
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!data.data || data.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Voo não encontrado. Verifique o número do voo ou insira os dados manualmente.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const flight = data.data[0];
    const result = {
      airline: flight.airline?.name || '',
      flight_number: flight.flight?.iata || flightNumber.toUpperCase(),
      origin_airport: flight.departure?.iata || '',
      origin_city: flight.departure?.timezone?.split('/').pop()?.replace(/_/g, ' ') || '',
      destination_airport: flight.arrival?.iata || '',
      destination_city: flight.arrival?.timezone?.split('/').pop()?.replace(/_/g, ' ') || '',
      departure_time: flight.departure?.scheduled || '',
      arrival_time: flight.arrival?.scheduled || '',
      flight_status: flight.flight_status || '',
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
