import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGooglePlacePhotoUrl } from "../_shared/google-photo.ts";

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
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço temporariamente indisponível." }),
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
      const fields = "name,formatted_address,photos,geometry,types,place_id,price_level,rating,user_ratings_total,editorial_summary,url,website,international_phone_number";
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
      // Resolve each to its final googleusercontent.com URL so we never
      // store API-key-bearing or photo_reference-bound URLs in the cache.
      const photoUrls = (
        await Promise.all(
          photos.map((p: any) =>
            resolveGooglePlacePhotoUrl(p.photo_reference, GOOGLE_PLACES_API_KEY, 1600),
          ),
        )
      ).filter((u): u is string => Boolean(u));

      const placeData: any = {
        place_id: r.place_id,
        name: r.name || "",
        address: r.formatted_address || "",
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls,
        place_type: (r.types || [])[0] || place_type || "establishment",
        latitude: r.geometry?.location?.lat || null,
        longitude: r.geometry?.location?.lng || null,
        raw_data: {
          types: r.types,
          price_level: r.price_level ?? null,
          rating: r.rating ?? null,
          user_ratings_total: r.user_ratings_total ?? null,
          editorial_summary: r.editorial_summary?.overview ?? null,
          maps_url: r.url ?? null,
          website: r.website ?? null,
          phone: r.international_phone_number ?? null,
        },
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

    // ⚠️ Never concatenate `context_city` into the query text — Google may
    // return a place from the wrong city. Instead, resolve the context city
    // to coordinates and use `locationbias` to bias (but not force) results.
    const searchInput = input;
    const googleType = TYPE_FILTERS[place_type || "general"] || "establishment";

    let cityBias: { lat: number; lng: number } | null = null;
    if (context_city && typeof context_city === "string" && context_city.trim().length >= 2) {
      cityBias = await resolveCityCoords(supabaseAdmin, context_city.trim(), GOOGLE_PLACES_API_KEY);
    }

    const buildParams = (opts: { brOnly?: boolean } = {}) => {
      const p = new URLSearchParams({
        input: searchInput,
        key: GOOGLE_PLACES_API_KEY,
        language: "pt-BR",
      });
      if (googleType === "(cities)") {
        // Use `geocode` instead of strict `(cities)` so destinations
        // classified as natural_feature/island (e.g. Fernando de Noronha
        // archipelago) or administrative regions still appear.
        p.set("types", "geocode");
      } else {
        p.set("types", "establishment");
      }
      if (cityBias) {
        // 50km circle around the resolved context city.
        p.set("locationbias", `circle:50000@${cityBias.lat},${cityBias.lng}`);
        p.set("location", `${cityBias.lat},${cityBias.lng}`);
        p.set("radius", "50000");
      } else {
        p.set("location", "-14.235,-51.9253");
        p.set("radius", "2000000");
      }
      p.set("region", "br");
      if (opts.brOnly) p.set("components", "country:br");
      return p;
    };

    const fetchPreds = async (brOnly: boolean) => {
      const u = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${buildParams({ brOnly })}`;
      const r = await fetch(u);
      const j = await r.json();
      if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
        console.error("Places Autocomplete error:", j.status, j.error_message);
        return [];
      }
      return (j.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        secondary: p.structured_formatting?.secondary_text || "",
        description: p.description,
        types: p.types || [],
        matched_type: matchesType(p.types || [], googleType),
      }));
    };

    // Always do two calls in parallel: one restricted to Brazil and one
    // unrestricted. We prepend Brazilian results so ambiguous names like
    // "Fernando de Noronha" surface the actual brazilian destination first,
    // while international destinations (Paris, Roma, Buenos Aires) still
    // appear from the unrestricted call.
    const [brPreds, intlPreds] = await Promise.all([fetchPreds(true), fetchPreds(false)]);
    const seen = new Set<string>();
    let predictions: any[] = [];
    for (const p of [...brPreds, ...intlPreds]) {
      if (seen.has(p.place_id)) continue;
      seen.add(p.place_id);
      predictions.push(p);
    }

    // Relevance scoring: boost Brazil + known tourist places, demote far-fetched
    // homonyms (e.g. "Fernando de Noronha — Krai de Stavropol, Rússia").
    const score = (p: any): number => {
      let s = 0;
      const sec = (p.secondary || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      if (sec.includes("brasil") || sec.includes("brazil") || desc.includes("brasil") || desc.includes("brazil")) s += 100;
      // Penalize obvious non-tourism administrative homonyms
      if (sec.includes("rússia") || sec.includes("россия") || sec.includes("rosiya")) s -= 50;
      if (p.matched_type) s += 10;
      // Tourist locality types
      const types: string[] = p.types || [];
      if (types.includes("locality") || types.includes("administrative_area_level_2")) s += 5;
      if (types.includes("tourist_attraction") || types.includes("natural_feature")) s += 8;
      return s;
    };
    predictions.sort((a: any, b: any) => score(b) - score(a));

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

/**
 * Resolve a free-text city name to {lat,lng} for use as `locationbias`.
 * Order: place_cache (case-insensitive name match with coordinates) →
 * Google `findplacefromtext` (cities) → null.
 * Successful Google lookups are persisted in place_cache to avoid repeated calls.
 */
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
  } catch (_) {
    // ignore and fall through
  }

  try {
    const u = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(cityName)}&inputtype=textquery&fields=place_id,name,geometry,formatted_address,types&key=${googleKey}&language=pt-BR`;
    const r = await fetch(u);
    const j = await r.json();
    const c = j.candidates?.[0];
    const loc = c?.geometry?.location;
    if (!c?.place_id || !loc) return null;
    // Persist as a city entry in place_cache (best-effort).
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
