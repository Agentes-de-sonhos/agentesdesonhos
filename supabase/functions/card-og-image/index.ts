import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates a 1200x630 OG image for a business card as SVG.
 * WhatsApp, Facebook, and Twitter all accept SVG served with image/svg+xml.
 * Falls back to a redirect to the photo or a default image.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: card } = await supabase
      .from("business_cards")
      .select("name, title, agency_name, photo_url, primary_color, secondary_color, logos")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!card) {
      return new Response("Card not found", { status: 404, headers: corsHeaders });
    }

    const primaryColor = card.primary_color || "#0284c7";
    const secondaryColor = card.secondary_color || "#f97316";
    const name = escSvg(card.name || "Agente de Viagens");
    const title = escSvg(card.title || "Agente de Viagens");
    const agency = escSvg(card.agency_name || "");
    const photoUrl = card.photo_url || "";
    const logos = (card.logos as string[]) || [];
    const logoUrl = logos.length > 0 ? logos[0] : "";

    // Fetch photo as base64 for embedding
    let photoBase64 = "";
    if (photoUrl) {
      try {
        const res = await fetch(photoUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          photoBase64 = `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
        }
      } catch { /* skip */ }
    }

    let logoBase64 = "";
    if (logoUrl) {
      try {
        const res = await fetch(logoUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/png";
          logoBase64 = `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
        }
      } catch { /* skip */ }
    }

    // Build SVG 1200x630
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${escAttr(primaryColor)};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${escAttr(secondaryColor)};stop-opacity:1" />
    </linearGradient>
    <clipPath id="photoClip">
      <circle cx="300" cy="315" r="110" />
    </clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Semi-transparent overlay for text readability -->
  <rect x="0" y="0" width="1200" height="630" fill="rgba(0,0,0,0.15)" />

  <!-- Decorative circles -->
  <circle cx="1100" cy="100" r="200" fill="rgba(255,255,255,0.05)" />
  <circle cx="100" cy="530" r="150" fill="rgba(255,255,255,0.05)" />

  <!-- Photo circle with white border -->
  ${photoBase64 ? `
    <circle cx="300" cy="315" r="118" fill="white" filter="url(#shadow)" />
    <image href="${photoBase64}" x="190" y="205" width="220" height="220" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice" />
  ` : `
    <circle cx="300" cy="315" r="118" fill="white" filter="url(#shadow)" />
    <circle cx="300" cy="315" r="110" fill="${escAttr(primaryColor)}" opacity="0.8" />
    <text x="300" y="340" font-family="Arial,Helvetica,sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">${name.charAt(0).toUpperCase()}</text>
  `}

  <!-- Name -->
  <text x="520" y="260" font-family="Arial,Helvetica,sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="start">
    ${truncate(name, 25)}
  </text>

  <!-- Title / Role -->
  <text x="520" y="310" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="start">
    ${truncate(title, 40)}
  </text>

  <!-- Agency name -->
  ${agency ? `
    <text x="520" y="360" font-family="Arial,Helvetica,sans-serif" font-size="24" fill="rgba(255,255,255,0.8)" text-anchor="start">
      🏢 ${truncate(agency, 35)}
    </text>
  ` : ""}

  <!-- CTA text -->
  <text x="520" y="430" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="rgba(255,255,255,0.7)" text-anchor="start">
    ✈️ Fale comigo e planeje sua viagem
  </text>

  <!-- Agency logo bottom right -->
  ${logoBase64 ? `
    <image href="${logoBase64}" x="950" y="480" width="200" height="100" preserveAspectRatio="xMaxYMax meet" opacity="0.9" />
  ` : ""}

  <!-- Domain watermark -->
  <text x="60" y="590" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="rgba(255,255,255,0.5)" text-anchor="start">
    contato.tur.br
  </text>
</svg>`;

    // Convert SVG to PNG using resvg-wasm for maximum compatibility
    // Fallback: serve as SVG (most platforms support it)
    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("OG image error:", err);
    // Redirect to default image
    return Response.redirect("https://www.vitrine.tur.br/favicon.png", 302);
  }
});

function escSvg(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max) + "…";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
