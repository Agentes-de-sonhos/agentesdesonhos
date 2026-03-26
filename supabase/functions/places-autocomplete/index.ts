import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps our place types to Google Places types
const TYPE_FILTERS: Record<string, string> = {
  city: "(cities)",
  hotel: "lodging",
  restaurant: "restaurant",
  car_rental: "car_rental",
  attraction: "tourist_attraction",
  general: "establishment",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, place_type, context_city, fetch_details, place_id } = await req.json();

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ─── Mode 1: Fetch details for a place_id ───
    if (fetch_details && place_id) {
      // Check cache first
      const { data: cached } = await supabaseAdmin
        .from("place_cache")
        .select("*")
        .eq("place_id", place_id)
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({ place: cached }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch from Google
      const fields = "name,formatted_address,photos,geometry,types,place_id";
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}&language=pt-BR`;
      const resp = await fetch(detailsUrl);
      const data = await resp.json();

      if (data.status !== "OK" || !data.result) {
        return new Response(JSON.stringify({ place: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const r = data.result;
      const photos = (r.photos || []).slice(0, 6);
      const photoUrls = photos.map((p: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      );

      const placeData = {
        place_id: r.place_id,
        name: r.name || "",
        address: r.formatted_address || "",
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls,
        place_type: (r.types || [])[0] || place_type || "establishment",
        latitude: r.geometry?.location?.lat || null,
        longitude: r.geometry?.location?.lng || null,
        raw_data: { types: r.types },
      };

      // Save to cache
      await supabaseAdmin.from("place_cache").upsert(placeData, { onConflict: "place_id" });

      return new Response(JSON.stringify({ place: placeData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Mode 2: Autocomplete search ───
    if (!input || input.trim().length < 3) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchInput = context_city ? `${input} ${context_city}` : input;
    const googleType = TYPE_FILTERS[place_type || "general"] || "establishment";

    const params = new URLSearchParams({
      input: searchInput,
      key: GOOGLE_PLACES_API_KEY,
      language: "pt-BR",
    });

    // "(cities)" uses the special types parameter format
    if (googleType === "(cities)") {
      params.set("types", "(cities)");
    } else {
      params.set("types", "establishment");
      // We'll filter by type in post-processing for better results
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places Autocomplete error:", data.status, data.error_message);
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let predictions = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      secondary: p.structured_formatting?.secondary_text || "",
      description: p.description,
      types: p.types || [],
      matched_type: matchesType(p.types || [], googleType),
    }));

    // Sort: matched type first
    if (googleType !== "(cities)" && googleType !== "establishment") {
      predictions.sort((a: any, b: any) => (b.matched_type ? 1 : 0) - (a.matched_type ? 1 : 0));
    }

    predictions = predictions.slice(0, 6);

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("places-autocomplete error:", e);
    return new Response(
      JSON.stringify({ predictions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function matchesType(types: string[], targetType: string): boolean {
  if (targetType === "establishment" || targetType === "(cities)") return true;
  return types.includes(targetType);
}
