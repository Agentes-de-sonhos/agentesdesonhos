import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, city } = await req.json();

    if (!input || input.trim().length < 3) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço temporariamente indisponível." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ⚠️ Never concatenate `city` into the query — it can return a hotel from
    // the wrong city. Resolve the city to coordinates and use `locationbias`.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const cityBias = city && city.trim().length >= 2
      ? await resolveCityCoords(supabaseAdmin, city.trim(), GOOGLE_PLACES_API_KEY)
      : null;

    const params = new URLSearchParams({
      input: input.trim(),
      types: "establishment",
      key: GOOGLE_PLACES_API_KEY,
      language: "pt-BR",
    });
    if (cityBias) {
      params.set("locationbias", `circle:50000@${cityBias.lat},${cityBias.lng}`);
      params.set("location", `${cityBias.lat},${cityBias.lng}`);
      params.set("radius", "50000");
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Autocomplete API error:", data.status, data.error_message);
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter and format predictions - prioritize lodging
    const predictions = (data.predictions || [])
      .filter((p: any) => {
        const types = p.types || [];
        // Prioritize lodging but allow other establishments
        return types.includes("lodging") || types.includes("establishment");
      })
      .slice(0, 5)
      .map((p: any) => ({
        place_id: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        secondary: p.structured_formatting?.secondary_text || "",
        description: p.description,
        is_hotel: (p.types || []).includes("lodging"),
      }));

    // Sort: hotels first
    predictions.sort((a: any, b: any) => (b.is_hotel ? 1 : 0) - (a.is_hotel ? 1 : 0));

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hotel-autocomplete error:", e);
    return new Response(
      JSON.stringify({ predictions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function resolveCityCoords(
  supabaseAdmin: ReturnType<typeof createClient>,
  cityName: string,
  googleKey: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data: cached } = await supabaseAdmin
      .from("place_cache")
      .select("latitude, longitude")
      .ilike("name", cityName)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(1)
      .maybeSingle();
    if (cached?.latitude != null && cached?.longitude != null) {
      return { lat: Number(cached.latitude), lng: Number(cached.longitude) };
    }
  } catch (_) {}

  try {
    const u = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(cityName)}&inputtype=textquery&fields=place_id,name,geometry,formatted_address,types&key=${googleKey}&language=pt-BR`;
    const r = await fetch(u);
    const j = await r.json();
    const c = j.candidates?.[0];
    const loc = c?.geometry?.location;
    if (!c?.place_id || !loc) return null;
    await supabaseAdmin.from("place_cache").upsert(
      {
        place_id: c.place_id,
        name: c.name || cityName,
        address: c.formatted_address || "",
        latitude: loc.lat,
        longitude: loc.lng,
        photo_url: null,
        photo_urls: [],
        place_type: (c.types || [])[0] || "locality",
        raw_data: { resolved_from: "context_city_lookup", input: cityName },
      },
      { onConflict: "place_id" },
    );
    return { lat: loc.lat, lng: loc.lng };
  } catch (_) {
    return null;
  }
}
