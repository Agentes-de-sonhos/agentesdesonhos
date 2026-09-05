import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveGooglePlacePhotoUrl } from "../_shared/google-photo.ts";

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
    const { place_id, photo_index, size } = await req.json();

    if (!place_id) {
      return new Response(
        JSON.stringify({ error: "place_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço temporariamente indisponível." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch place details with photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=photos,name&key=${GOOGLE_PLACES_API_KEY}&language=pt-BR`;
    const resp = await fetch(detailsUrl);
    const data = await resp.json();

    if (data.status !== "OK" || !data.result) {
      return new Response(
        JSON.stringify({ photos: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const all = (data.result.photos || []) as any[];

    // Caminho econômico: resolve APENAS a foto pedida (referência gplace://).
    // Uma única chamada cobrada de Places Photo por foto exibida.
    if (photo_index !== undefined && photo_index !== null) {
      const idx = Number(photo_index);
      const p = Number.isFinite(idx) ? all[idx] : null;
      const width = Number(size) > 0 ? Math.min(Number(size), 1600) : 1600;
      const url = p?.photo_reference
        ? await resolveGooglePlacePhotoUrl(p.photo_reference, GOOGLE_PLACES_API_KEY, width)
        : null;
      const photo = url
        ? {
            url,
            thumb_url: url,
            width: p.width,
            height: p.height,
            attributions: p.html_attributions || [],
          }
        : null;
      return new Response(
        JSON.stringify({ hotel_name: data.result.name || "", photo, photos: photo ? [photo] : [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Modo seleção: no máximo 5 sugestões e SOMENTE a miniatura (1 chamada por
    // foto). A versão grande é resolvida depois, só para a foto escolhida.
    const refs = all.slice(0, 5);
    const resolved = await Promise.all(
      refs.map(async (p: any) => {
        const thumb = await resolveGooglePlacePhotoUrl(p.photo_reference, GOOGLE_PLACES_API_KEY, 320);
        if (!thumb) return null;
        return {
          url: thumb,
          thumb_url: thumb,
          width: p.width,
          height: p.height,
          attributions: p.html_attributions || [],
        };
      }),
    );
    const photos = resolved.filter(Boolean);

    return new Response(
      JSON.stringify({ hotel_name: data.result.name || "", photos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("hotel-photos error:", e);
    return new Response(
      JSON.stringify({ photos: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
