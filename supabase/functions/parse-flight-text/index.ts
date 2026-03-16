import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseFlightText(text: string) {
  // Flight number: 2 letters + 3-4 digits
  const flightMatch = text.match(/\b([A-Z]{2}\s?\d{3,4})\b/i);
  const flightNumber = flightMatch ? flightMatch[1].replace(/\s/g, '').toUpperCase() : null;

  // Airport codes: 3 uppercase letters in parentheses
  const airportMatches = [...text.matchAll(/\(([A-Z]{3})\)/g)];
  const airports = airportMatches.map(m => m[1]);

  // Time pattern: HH:MM (24h)
  const timeMatches = [...text.matchAll(/\b(\d{2}:\d{2})\b/g)];
  const times = timeMatches.map(m => m[1]);

  // Date patterns: DD Mon, DD/MM, YYYY-MM-DD
  const dateMatches = [...text.matchAll(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\b/gi)];
  const dates = dateMatches.map(m => m[1]);

  return {
    flight_number: flightNumber || '',
    origin_airport: airports[0] || '',
    destination_airport: airports[1] || '',
    departure_time: times[0] || '',
    arrival_time: times[1] || '',
    departure_date: dates[0] || '',
    arrival_date: dates[1] || dates[0] || '',
  };
}

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

    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text field is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = parseFlightText(text);

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
