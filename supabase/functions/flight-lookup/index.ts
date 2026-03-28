import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CACHE_TTL_HOURS = 24;

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
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const rawFlightNumber = url.searchParams.get('flight_number');
    const flightDate = url.searchParams.get('flight_date') || '';

    if (!rawFlightNumber) {
      return new Response(JSON.stringify({ error: 'flight_number is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalize: remove spaces, uppercase
    const flightNumber = rawFlightNumber.replace(/\s+/g, '').toUpperCase();

    // 1. Check cache first
    const { data: cached } = await supabaseAdmin
      .from('flight_cache')
      .select('response_data, created_at')
      .eq('flight_number', flightNumber)
      .eq('flight_date', flightDate)
      .maybeSingle();

    if (cached) {
      const cacheAge = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
      if (cacheAge < CACHE_TTL_HOURS) {
        return new Response(JSON.stringify(cached.response_data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Try FlightAware AeroAPI first
    const flightAwareKey = Deno.env.get('FLIGHTAWARE_API_KEY');
    const aviationStackKey = Deno.env.get('AVIATIONSTACK_API_KEY');

    let result = null;

    if (flightAwareKey) {
      result = await fetchFromFlightAware(flightNumber, flightDate, flightAwareKey);
    }

    // 3. Fallback to AviationStack
    if (!result && aviationStackKey) {
      result = await fetchFromAviationStack(flightNumber, flightDate, aviationStackKey);
    }

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Não foi possível encontrar os dados deste voo. Preencha manualmente.',
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Save to cache (upsert)
    await supabaseAdmin.from('flight_cache').upsert(
      { flight_number: flightNumber, flight_date: flightDate, response_data: result, created_at: new Date().toISOString() },
      { onConflict: 'flight_number,flight_date' }
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("flight-lookup error:", err);
    return new Response(JSON.stringify({ error: 'Erro ao consultar voo.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ─── FlightAware AeroAPI ───

interface FlightSegment {
  airline: string;
  flight_number: string;
  origin_airport: string;
  origin_city: string;
  destination_airport: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  flight_status: string;
}

interface FlightResult {
  segments: FlightSegment[];
  // Flat fields for backward compatibility (first segment)
  airline: string;
  flight_number: string;
  origin_airport: string;
  origin_city: string;
  destination_airport: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  flight_status: string;
}

async function fetchFromFlightAware(flightNumber: string, flightDate: string, apiKey: string): Promise<FlightResult | null> {
  try {
    // Build ident with optional date filter
    let apiUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${flightNumber}`;
    if (flightDate) {
      // AeroAPI expects start/end as ISO timestamps
      const start = `${flightDate}T00:00:00Z`;
      const end = `${flightDate}T23:59:59Z`;
      apiUrl += `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    }

    const response = await fetch(apiUrl, {
      headers: { 'x-apikey': apiKey },
    });

    if (!response.ok) {
      console.error(`FlightAware API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const flights = data.flights;

    if (!flights || flights.length === 0) return null;

    // Sort by scheduled departure
    const sorted = flights
      .filter((f: any) => f.scheduled_out || f.scheduled_off)
      .sort((a: any, b: any) => {
        const timeA = a.scheduled_out || a.scheduled_off || '';
        const timeB = b.scheduled_out || b.scheduled_off || '';
        return timeA.localeCompare(timeB);
      });

    if (sorted.length === 0) return null;

    const segments: FlightSegment[] = sorted.map((f: any) => ({
      airline: f.operator || f.operator_iata || '',
      flight_number: f.ident_iata || f.ident || flightNumber,
      origin_airport: f.origin?.code_iata || f.origin?.code || '',
      origin_city: f.origin?.city || '',
      destination_airport: f.destination?.code_iata || f.destination?.code || '',
      destination_city: f.destination?.city || '',
      departure_time: f.scheduled_out || f.scheduled_off || '',
      arrival_time: f.scheduled_in || f.scheduled_on || '',
      flight_status: mapFlightAwareStatus(f.status),
    }));

    // First segment for flat backward-compatible fields
    const first = segments[0];
    return {
      segments,
      ...first,
    };
  } catch (err) {
    console.error('FlightAware fetch error:', err);
    return null;
  }
}

function mapFlightAwareStatus(status: string | undefined): string {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('scheduled') || s.includes('filed')) return 'scheduled';
  if (s.includes('en route') || s.includes('airborne')) return 'active';
  if (s.includes('landed') || s.includes('arrived')) return 'landed';
  if (s.includes('cancelled')) return 'cancelled';
  if (s.includes('delayed')) return 'delayed';
  if (s.includes('diverted')) return 'diverted';
  return status;
}

// ─── AviationStack fallback ───

async function fetchFromAviationStack(flightNumber: string, flightDate: string, apiKey: string): Promise<FlightResult | null> {
  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightNumber,
    });
    if (flightDate) params.set('flight_date', flightDate);

    const apiUrl = `http://api.aviationstack.com/v1/flights?${params.toString()}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok || data.error || !data.data || data.data.length === 0) return null;

    const flight = data.data[0];
    const segment: FlightSegment = {
      airline: flight.airline?.name || '',
      flight_number: flight.flight?.iata || flightNumber,
      origin_airport: flight.departure?.iata || '',
      origin_city: flight.departure?.timezone?.split('/').pop()?.replace(/_/g, ' ') || '',
      destination_airport: flight.arrival?.iata || '',
      destination_city: flight.arrival?.timezone?.split('/').pop()?.replace(/_/g, ' ') || '',
      departure_time: flight.departure?.scheduled || '',
      arrival_time: flight.arrival?.scheduled || '',
      flight_status: flight.flight_status || '',
    };

    return { segments: [segment], ...segment };
  } catch (err) {
    console.error('AviationStack fetch error:', err);
    return null;
  }
}
