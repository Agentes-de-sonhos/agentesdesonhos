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

    if (!flightNumber) {
      return new Response(JSON.stringify({ error: 'flight_number is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('AVIATIONSTACK_API_KEY');
    if (!apiKey) {
      console.error('AVIATIONSTACK_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Serviço temporariamente indisponível.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightNumber.toUpperCase(),
    });

    const apiUrl = `http://api.aviationstack.com/v1/flights?${params.toString()}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error) {
      return new Response(JSON.stringify({ error: 'API error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!data.data || data.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Voo não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const flight = data.data[0];
    const statusMap: Record<string, string> = {
      scheduled: 'No Horário',
      active: 'Em Voo',
      landed: 'Pousou',
      cancelled: 'Cancelado',
      incident: 'Incidente',
      diverted: 'Desviado',
      delayed: 'Atrasado',
    };

    return new Response(JSON.stringify({
      flight_number: flight.flight?.iata || flightNumber.toUpperCase(),
      airline: flight.airline?.name || '',
      origin: flight.departure?.iata || '',
      destination: flight.arrival?.iata || '',
      status: flight.flight_status || 'unknown',
      status_label: statusMap[flight.flight_status] || flight.flight_status || 'Desconhecido',
      departure_scheduled: flight.departure?.scheduled || '',
      arrival_scheduled: flight.arrival?.scheduled || '',
      departure_actual: flight.departure?.actual || '',
      arrival_actual: flight.arrival?.actual || '',
      delay: flight.departure?.delay || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error("flight-status error:", err);
    return new Response(JSON.stringify({ error: 'Erro ao consultar status do voo.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
