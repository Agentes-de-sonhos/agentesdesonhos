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
    const { place_id } = await req.json();

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

    // Resolve every photo to its final googleusercontent.com URL so we
    // never leak the API key in public HTML and avoid broken photo_reference
    // tokens once Google rotates them.
    const refs = (data.result.photos || []).slice(0, 10);
    const resolved = await Promise.all(
      refs.map(async (p: any) => {
        const [full, thumb] = await Promise.all([
          resolveGooglePlacePhotoUrl(p.photo_reference, GOOGLE_PLACES_API_KEY, 1600),
          resolveGooglePlacePhotoUrl(p.photo_reference, GOOGLE_PLACES_API_KEY, 320),
        ]);
        if (!full) return null;
        return {
          url: full,
          thumb_url: thumb || full,
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
