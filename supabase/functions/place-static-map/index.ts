import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Proxy de mapa estático do Google. Mantém a chave no servidor — a carteira
 * digital pública nunca recebe credenciais. Só aceita coordenadas válidas.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const num = (name: string) => {
    const v = Number(url.searchParams.get(name));
    return Number.isFinite(v) ? v : null;
  };

  const lat = num("lat");
  const lng = num("lng");
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return new Response("Coordenadas inválidas", { status: 400, headers: corsHeaders });
  }

  const clamp = (v: number | null, min: number, max: number, fallback: number) =>
    v === null ? fallback : Math.min(max, Math.max(min, Math.round(v)));
  const width = clamp(num("w"), 200, 1280, 640);
  const height = clamp(num("h"), 120, 1280, 260);
  const zoom = clamp(num("zoom"), 1, 20, 15);
  const scale = num("scale") === 1 ? 1 : 2;

  const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!KEY) {
    console.error("GOOGLE_PLACES_API_KEY not configured");
    return new Response("Mapa indisponível", { status: 503, headers: corsHeaders });
  }

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: "roadmap",
    markers: `color:red|${lat},${lng}`,
    language: "pt-BR",
    key: KEY,
  });

  try {
    const resp = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`);
    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`static map failed [${resp.status}]: ${detail.slice(0, 300)}`);
      return new Response("Mapa indisponível", { status: 502, headers: corsHeaders });
    }
    const bytes = await resp.arrayBuffer();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": resp.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("place-static-map error:", e);
    return new Response("Mapa indisponível", { status: 500, headers: corsHeaders });
  }
});