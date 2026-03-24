import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      return new Response(
        JSON.stringify({ error: "GOOGLE_PLACES_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search input with city context
    const searchInput = city ? `${input} ${city}` : input;

    const params = new URLSearchParams({
      input: searchInput,
      types: "establishment",
      key: GOOGLE_PLACES_API_KEY,
      language: "pt-BR",
    });

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
