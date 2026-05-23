import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  query: string;        // ex: "Torre Eiffel"
  destination?: string; // ex: "Paris"
  location?: string;    // ex: "Champ de Mars"
}

function normalizeKey(q: string, destination?: string, location?: string) {
  const parts = [q, location, destination]
    .filter(Boolean)
    .map((s) =>
      String(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
  return parts.join("|").slice(0, 220);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    if (!body?.query || body.query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const key = normalizeKey(body.query, body.destination, body.location);

    // 1) cache lookup
    const { data: cached } = await admin
      .from("activity_photo_cache")
      .select("photo_url, thumb_url, place_id, source, attributions")
      .eq("query_key", key)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Google Places (Find Place from Text)
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(JSON.stringify({ photo_url: null, error: "no_provider" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const queryText = [body.query, body.location, body.destination].filter(Boolean).join(" ");
    const findUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(queryText)}` +
      `&inputtype=textquery&fields=place_id,name,photos&language=pt-BR` +
      `&key=${GOOGLE_PLACES_API_KEY}`;
    const findResp = await fetch(findUrl);
    const findData = await findResp.json();

    const candidate = findData?.candidates?.[0];
    if (!candidate?.place_id) {
      // Persist negative cache (empty url) to avoid retries
      await admin.from("activity_photo_cache").upsert({
        query_key: key,
        photo_url: null,
        thumb_url: null,
        place_id: null,
        source: "google_places",
      });
      return new Response(JSON.stringify({ photo_url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let photoRef: string | null = candidate.photos?.[0]?.photo_reference ?? null;
    let attributions: string[] = candidate.photos?.[0]?.html_attributions ?? [];

    // Some candidates miss photo info → fetch details
    if (!photoRef) {
      const detUrl =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${candidate.place_id}&fields=photos&language=pt-BR` +
        `&key=${GOOGLE_PLACES_API_KEY}`;
      const detResp = await fetch(detUrl);
      const detData = await detResp.json();
      const photo = detData?.result?.photos?.[0];
      photoRef = photo?.photo_reference ?? null;
      attributions = photo?.html_attributions ?? [];
    }

    if (!photoRef) {
      await admin.from("activity_photo_cache").upsert({
        query_key: key,
        photo_url: null,
        thumb_url: null,
        place_id: candidate.place_id,
        source: "google_places",
      });
      return new Response(JSON.stringify({ photo_url: null, place_id: candidate.place_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
    const thumb_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=240&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;

    await admin.from("activity_photo_cache").upsert({
      query_key: key,
      photo_url,
      thumb_url,
      place_id: candidate.place_id,
      source: "google_places",
      attributions,
    });

    return new Response(
      JSON.stringify({ photo_url, thumb_url, place_id: candidate.place_id, attributions, source: "google_places" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("activity-photo error", e);
    return new Response(JSON.stringify({ photo_url: null, error: "internal" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
