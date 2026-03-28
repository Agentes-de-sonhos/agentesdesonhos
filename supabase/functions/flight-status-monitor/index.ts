import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const statusMap: Record<string, string> = {
  scheduled: 'Confirmado',
  filed: 'Confirmado',
  active: 'Em Voo',
  'en route': 'Em Voo',
  landed: 'Pousou',
  arrived: 'Pousou',
  cancelled: 'Cancelado',
  incident: 'Incidente',
  diverted: 'Desviado',
  delayed: 'Atrasado',
};

function mapStatus(raw: string | undefined): { status: string; label: string } {
  if (!raw) return { status: 'scheduled', label: 'Confirmado' };
  const s = raw.toLowerCase();
  for (const [key, label] of Object.entries(statusMap)) {
    if (s.includes(key)) return { status: key.includes(' ') ? 'active' : key, label };
  }
  return { status: raw, label: raw };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const flightAwareKey = Deno.env.get('FLIGHTAWARE_API_KEY');
    if (!flightAwareKey) {
      console.error('FLIGHTAWARE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Serviço temporariamente indisponível.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find all flight services with flights in the next 24h or past 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yStr = yesterday.toISOString().split('T')[0];
    const tStr = tomorrow.toISOString().split('T')[0];

    // Get all flight-type trip_services
    const { data: flightServices, error: fetchErr } = await supabase
      .from('trip_services')
      .select('id, service_data, trip_id')
      .eq('service_type', 'flight');

    if (fetchErr) {
      console.error('Error fetching flight services:', fetchErr);
      return new Response(JSON.stringify({ error: 'Erro ao buscar serviços de voo.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    let checked = 0;

    for (const svc of (flightServices || [])) {
      const data = svc.service_data as any;
      if (!data) continue;

      // Extract segments from service_data
      const segments: any[] = data.segments || [];
      if (segments.length === 0) continue;

      for (const seg of segments) {
        const flightNum = (seg.flight_number || '').replace(/\s+/g, '').toUpperCase();
        const flightDate = seg.flight_date || '';

        if (!flightNum || !flightDate) continue;

        // Only monitor flights within ±24h window
        if (flightDate < yStr || flightDate > tStr) continue;

        checked++;

        // Check if we recently updated this flight (skip if <15 min ago)
        const { data: existing } = await supabase
          .from('flight_status_updates')
          .select('last_checked_at, status')
          .eq('trip_service_id', svc.id)
          .eq('flight_number', flightNum)
          .eq('flight_date', flightDate)
          .maybeSingle();

        if (existing) {
          const lastCheck = new Date(existing.last_checked_at).getTime();
          const minsSinceCheck = (now.getTime() - lastCheck) / (1000 * 60);
          // Skip if checked less than 14 minutes ago, or if already landed/cancelled
          if (minsSinceCheck < 14) continue;
          if (['landed', 'arrived', 'cancelled'].includes(existing.status)) continue;
        }

        // Fetch from FlightAware
        try {
          const start = `${flightDate}T00:00:00Z`;
          const end = `${flightDate}T23:59:59Z`;
          const apiUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${flightNum}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

          const resp = await fetch(apiUrl, {
            headers: { 'x-apikey': flightAwareKey },
          });

          if (!resp.ok) {
            console.error(`FlightAware error for ${flightNum}: ${resp.status}`);
            continue;
          }

          const apiData = await resp.json();
          const flights = apiData.flights;
          if (!flights || flights.length === 0) continue;

          // Pick the first matching flight
          const f = flights[0];
          const mapped = mapStatus(f.status);

          await supabase.from('flight_status_updates').upsert({
            trip_service_id: svc.id,
            flight_number: flightNum,
            flight_date: flightDate,
            status: mapped.status,
            status_label: mapped.label,
            departure_scheduled: f.scheduled_out || f.scheduled_off || '',
            departure_actual: f.actual_out || f.actual_off || '',
            arrival_scheduled: f.scheduled_in || f.scheduled_on || '',
            arrival_actual: f.actual_in || f.actual_on || '',
            terminal: f.terminal_origin || '',
            gate: f.gate_origin || '',
            delay_minutes: f.departure_delay || 0,
            last_checked_at: now.toISOString(),
            updated_at: now.toISOString(),
          }, { onConflict: 'trip_service_id,flight_number,flight_date' });

          updated++;
        } catch (flightErr) {
          console.error(`Error fetching ${flightNum}:`, flightErr);
        }
      }
    }

    return new Response(JSON.stringify({ checked, updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("flight-status-monitor error:", err);
    return new Response(JSON.stringify({ error: 'Erro ao monitorar voos.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
