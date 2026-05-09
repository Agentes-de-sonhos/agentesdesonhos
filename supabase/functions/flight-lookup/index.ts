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

    // 3. Fallback to FlightAware /schedules (covers up to ~330 days ahead)
    if (!result && flightAwareKey && flightDate) {
      result = await fetchFromFlightAwareSchedules(flightNumber, flightDate, flightAwareKey);
    }

    // 4. Fallback to AviationStack
    if (!result && aviationStackKey) {
      result = await fetchFromAviationStack(flightNumber, flightDate, aviationStackKey);
    }

    if (!result) {
      return new Response(JSON.stringify({
        error: flightDate
          ? 'Não encontramos um voo com partida nesta data. Verifique se a data informada corresponde à data de saída do voo.'
          : 'Não foi possível encontrar os dados deste voo. Preencha manualmente.',
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
      // AeroAPI expects start/end as ISO timestamps. Expand the window by ±1 day
      // to account for timezone differences between UTC and the origin airport's
      // local time — we will filter to the user-selected departure date below
      // using the origin airport's timezone.
      const selected = new Date(`${flightDate}T00:00:00Z`);
      const start = new Date(selected.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(selected.getTime() + 48 * 60 * 60 * 1000).toISOString();
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

    // CRITICAL: when a date is provided we must select the flight whose
    // DEPARTURE (scheduled_out) falls on the user's selected date in the
    // origin airport's local timezone — not a flight from the day before
    // that merely arrived on this date.
    let candidates = sorted;
    if (flightDate) {
      const matching = sorted.filter((f: any) => {
        const dep = f.scheduled_out || f.estimated_out || f.actual_out || f.scheduled_off;
        if (!dep) return false;
        const tz = f.origin?.timezone;
        const localDate = formatDateInTimezone(dep, tz);
        return localDate === flightDate;
      });
      if (matching.length === 0) {
        return null; // signal "no flight departing on selected date"
      }
      candidates = matching;
    }

    const segments: FlightSegment[] = candidates.map((f: any) => ({
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

// Returns YYYY-MM-DD for the given ISO timestamp in the supplied IANA timezone.
// Falls back to UTC date if timezone is missing/invalid.
function formatDateInTimezone(isoTimestamp: string, timeZone: string | undefined): string {
  try {
    const d = new Date(isoTimestamp);
    if (isNaN(d.getTime())) return '';
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(d); // en-CA gives YYYY-MM-DD
  } catch {
    return isoTimestamp.slice(0, 10);
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

// ─── FlightAware /schedules (future flights up to ~330 days) ───

async function fetchFromFlightAwareSchedules(
  flightNumber: string,
  flightDate: string,
  apiKey: string
): Promise<FlightResult | null> {
  try {
    // /schedules expects date_start/date_end as YYYY-MM-DD (inclusive start, exclusive end).
    // It does NOT accept `ident` — must split into airline (letters) + flight_number (digits).
    const match = flightNumber.match(/^([A-Z]{2,3})\s*(\d{1,4})$/i);
    if (!match) {
      console.error(`/schedules: cannot parse flight number "${flightNumber}"`);
      return null;
    }
    const airline = match[1].toUpperCase();
    const flightNum = match[2];

    // Use a 1-day window per the API (max 2 days). End is exclusive.
    const selected = new Date(`${flightDate}T00:00:00Z`);
    const startDate = flightDate;
    const endDate = new Date(selected.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const apiUrl = `https://aeroapi.flightaware.com/aeroapi/schedules/${startDate}/${endDate}?airline=${encodeURIComponent(airline)}&flight_number=${encodeURIComponent(flightNum)}`;
    const response = await fetch(apiUrl, { headers: { 'x-apikey': apiKey } });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`FlightAware /schedules error: ${response.status} ${errText}`);
      return null;
    }

    const data = await response.json();
    const scheduled = data.scheduled || [];
    if (scheduled.length === 0) return null;

    // Prefer the actual operating flight (not codeshares). When `actual_ident` is null,
    // the row IS the operating flight under the requested airline/number.
    const operating = scheduled.filter(
      (f: any) => f.scheduled_out && !f.actual_ident
    );
    const pool = operating.length > 0 ? operating : scheduled.filter((f: any) => f.scheduled_out);
    if (pool.length === 0) return null;

    // Deduplicate by ident + scheduled_out (codeshares can repeat the same physical flight)
    const seen = new Set<string>();
    const unique = pool.filter((f: any) => {
      const key = `${f.ident_icao || f.ident}_${f.scheduled_out}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter by user-selected date (origin local time when tz available, else UTC).
    const matching = unique.filter((f: any) => {
      const tz = f.origin?.timezone;
      return formatDateInTimezone(f.scheduled_out, tz) === flightDate;
    });
    const candidates = matching.length > 0 ? matching : unique;

    candidates.sort((a: any, b: any) =>
      String(a.scheduled_out).localeCompare(String(b.scheduled_out))
    );

    const segments: FlightSegment[] = candidates.map((f: any) => {
      // /schedules has flat fields: origin (ICAO string), origin_iata, destination, etc.
      const originIata = typeof f.origin === 'object' ? (f.origin?.code_iata || f.origin?.code) : f.origin_iata;
      const destIata = typeof f.destination === 'object' ? (f.destination?.code_iata || f.destination?.code) : f.destination_iata;
      const originIcao = typeof f.origin === 'string' ? f.origin : (f.origin?.code_icao || f.origin_icao);
      const destIcao = typeof f.destination === 'string' ? f.destination : (f.destination?.code_icao || f.destination_icao);
      return {
        airline: f.operator_iata || f.operator || airline,
        flight_number: f.ident_iata || f.actual_ident_iata || f.ident || flightNumber,
        origin_airport: originIata || originIcao || '',
        origin_city: f.origin?.city || '',
        destination_airport: destIata || destIcao || '',
        destination_city: f.destination?.city || '',
        departure_time: f.scheduled_out || '',
        arrival_time: f.scheduled_in || '',
        flight_status: 'scheduled',
      };
    });

    const first = segments[0];
    return { segments, ...first };
  } catch (err) {
    console.error('FlightAware /schedules fetch error:', err);
    return null;
  }
}

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

    // Filter to flights whose DEPARTURE date matches the requested date in
    // the origin airport's local timezone, to avoid picking a same-numbered
    // flight that departed the previous day.
    let candidates = data.data;
    if (flightDate) {
      candidates = data.data.filter((f: any) => {
        const dep = f.departure?.scheduled || f.departure?.estimated;
        if (!dep) return false;
        const tz = f.departure?.timezone;
        return formatDateInTimezone(dep, tz) === flightDate;
      });
      if (candidates.length === 0) return null;
    }

    const flight = candidates[0];
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
