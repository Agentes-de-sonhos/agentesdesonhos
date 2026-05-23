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
    const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");

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

    const queryText = [body.query, body.location, body.destination].filter(Boolean).join(" ");

    // Helper: persist & return
    const persistAndReturn = async (payload: {
      photo_url: string | null;
      thumb_url: string | null;
      place_id?: string | null;
      source: string;
      attributions?: any;
    }) => {
      await admin.from("activity_photo_cache").upsert({
        query_key: key,
        photo_url: payload.photo_url,
        thumb_url: payload.thumb_url,
        place_id: payload.place_id ?? null,
        source: payload.source,
        attributions: payload.attributions ?? null,
      });
      return new Response(JSON.stringify({ ...payload, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    // 2) Google Places
    if (GOOGLE_PLACES_API_KEY) {
      try {
    const findUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(queryText)}` +
      `&inputtype=textquery&fields=place_id,name,photos&language=pt-BR` +
      `&key=${GOOGLE_PLACES_API_KEY}`;
    const findResp = await fetch(findUrl);
    const findData = await findResp.json();

    const candidate = findData?.candidates?.[0];
        if (candidate?.place_id) {
          let photoRef: string | null = candidate.photos?.[0]?.photo_reference ?? null;
          let attributions: string[] = candidate.photos?.[0]?.html_attributions ?? [];

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

          if (photoRef) {
            const photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
            const thumb_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=240&photo_reference=${photoRef}&key=${GOOGLE_PLACES_API_KEY}`;
            return await persistAndReturn({
              photo_url, thumb_url, place_id: candidate.place_id,
              source: "google_places", attributions,
            });
          }
        }
      } catch (e) {
        console.warn("google_places failed", e);
      }
    }

    // 3) Unsplash fallback
    if (UNSPLASH_ACCESS_KEY) {
      try {
        const url = `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(queryText)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        });
        const d = await r.json();
        const p = d?.results?.[0];
        if (p?.urls) {
          return await persistAndReturn({
            photo_url: p.urls.regular ?? p.urls.full ?? null,
            thumb_url: p.urls.thumb ?? p.urls.small ?? null,
            source: "unsplash",
            attributions: [
              `Foto por <a href="${p.user?.links?.html}?utm_source=lovable&utm_medium=referral">${p.user?.name}</a> no <a href="https://unsplash.com/?utm_source=lovable&utm_medium=referral">Unsplash</a>`,
            ],
          });
        }
      } catch (e) {
        console.warn("unsplash failed", e);
      }
    }

    // 4) Pexels fallback
    if (PEXELS_API_KEY) {
      try {
        const url = `https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=${encodeURIComponent(queryText)}`;
        const r = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
        const d = await r.json();
        const p = d?.photos?.[0];
        if (p?.src) {
          return await persistAndReturn({
            photo_url: p.src.large ?? p.src.original ?? null,
            thumb_url: p.src.tiny ?? p.src.small ?? null,
            source: "pexels",
            attributions: [
              `Foto por <a href="${p.photographer_url}">${p.photographer}</a> no <a href="https://www.pexels.com">Pexels</a>`,
            ],
          });
        }
      } catch (e) {
        console.warn("pexels failed", e);
      }
    }

    // 5) Negative cache
    return await persistAndReturn({
      photo_url: null, thumb_url: null, source: "none",
    });
  } catch (e) {
    console.error("activity-photo error", e);
    return new Response(JSON.stringify({ photo_url: null, error: "internal" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
