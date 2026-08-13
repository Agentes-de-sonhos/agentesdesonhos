import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function component(components: any[], type: string): string | null {
  const c = (components || []).find((x) => (x.types || []).includes(type));
  return c?.long_name || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "").trim().slice(0, 200);
    const placeId = body?.place_id ? String(body.place_id).trim().slice(0, 200) : null;
    const limit = Math.min(5, Math.max(1, Number(body?.limit) || 4));

    if (!placeId && query.length < 3) {
      return json({ error: "Informe o nome do hotel para buscar." }, 400);
    }

    const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!KEY) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return json({ error: "Serviço de identificação indisponível." }, 503);
    }

    const detailFields = [
      "place_id", "name", "formatted_address", "address_components", "geometry/location",
      "international_phone_number", "formatted_phone_number", "website", "url", "types", "rating",
    ].join(",");

    const fetchDetails = async (id: string) => {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(id)}&fields=${detailFields}&language=pt-BR&key=${KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== "OK" || !data.result) {
        console.error("place details failed", data.status, data.error_message || "");
        return null;
      }
      const r = data.result;
      const comps = r.address_components || [];
      return {
        place_id: r.place_id,
        name: r.name || "",
        formatted_address: r.formatted_address || null,
        types: r.types || [],
        rating: r.rating ?? null,
        latitude: r.geometry?.location?.lat ?? null,
        longitude: r.geometry?.location?.lng ?? null,
        phone: r.international_phone_number || r.formatted_phone_number || null,
        website: r.website || null,
        maps_url: r.url || null,
        city:
          component(comps, "locality") ||
          component(comps, "administrative_area_level_2") ||
          null,
        state: component(comps, "administrative_area_level_1"),
        country: component(comps, "country"),
        postal_code: component(comps, "postal_code"),
      };
    };

    if (placeId) {
      const detail = await fetchDetails(placeId);
      if (!detail) return json({ candidates: [] });
      return json({ candidates: [detail] });
    }

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=lodging&language=pt-BR&key=${KEY}`;
    const searchResp = await fetch(searchUrl);
    const search = await searchResp.json();
    if (search.status !== "OK" && search.status !== "ZERO_RESULTS") {
      console.error("text search failed", search.status, search.error_message || "");
      return json({ candidates: [], status: search.status }, 200);
    }

    const ids = (search.results || [])
      .map((r: any) => r.place_id)
      .filter(Boolean)
      .slice(0, limit);

    const details = await Promise.all(ids.map((id: string) => fetchDetails(id)));
    return json({ candidates: details.filter(Boolean) });
  } catch (e) {
    console.error("hotel-place-match error:", e);
    return json({ error: "Não foi possível consultar o Google agora." }, 500);
  }
});