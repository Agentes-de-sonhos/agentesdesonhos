import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOMAINS: Record<string, string> = {
  "seuorcamento.tur.br": "quote",
  "seuroteiro.tur.br": "itinerary",
  "carteiradigital.tur.br": "wallet",
};

const OG_IMAGE = "https://www.vitrine.tur.br/favicon.png";

const DEFAULT_OG = {
  title: "O seu próximo destino começa aqui 🌍",
  description: "Tudo que você precisa para sua viagem em um só lugar",
};

const OG_CONTENT: Record<string, { title: string; description: string }> = {
  quote: DEFAULT_OG,
  itinerary: DEFAULT_OG,
  wallet: DEFAULT_OG,
  card: DEFAULT_OG,
  showcase: DEFAULT_OG,
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const targetUrl = url.searchParams.get("url");
  const token = url.searchParams.get("token");
  const slug = url.searchParams.get("slug");

  if (!type || !targetUrl) {
    return new Response("Missing required params", { status: 400 });
  }

  const content = OG_CONTENT[type] || OG_CONTENT.quote;
  let ogTitle = content.title;
  let ogDescription = content.description;
  let ogImage = OG_IMAGE;
  let twitterCard = "summary";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Enrich card type with real data from business_cards table
  if (type === "card" && slug) {
    try {
      const { data: card } = await supabase
        .from("business_cards")
        .select("id, name, title, agency_name, photo_url, primary_color, secondary_color, logos, user_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (card) {
        const titleParts = [card.name];
        if (card.title) titleParts.push(card.title);
        else if (card.agency_name) titleParts.push(card.agency_name);
        ogTitle = titleParts.join(" • ");

        ogDescription = card.agency_name
          ? `Fale comigo e planeje sua próxima viagem com ${card.agency_name} ✈️`
          : "Fale comigo e planeje sua próxima viagem com quem entende ✈️";

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        ogImage = `${supabaseUrl}/functions/v1/card-og-image?slug=${encodeURIComponent(slug)}`;
        twitterCard = "summary_large_image";
      }
    } catch {
      // Fallback to generic
    }
  }

  // Enrich showcase type with real data
  if (type === "showcase" && slug) {
    try {
      const { data: sc } = await supabase
        .from("agency_showcases")
        .select("slug, tagline, og_title, og_description, user_id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (sc) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_name, agency_logo_url")
          .eq("user_id", sc.user_id)
          .maybeSingle();

        const agencyName = profile?.agency_name || "";
        // Manual OG fields take priority, then auto-generated, then generic fallback
        if (sc.og_title) {
          ogTitle = sc.og_title;
        } else if (agencyName) {
          ogTitle = `Vitrine de Ofertas | ${agencyName} 🌍`;
        }

        if (sc.og_description) {
          ogDescription = sc.og_description;
        } else if (agencyName) {
          ogDescription = `Confira as melhores ofertas de viagem selecionadas por ${agencyName}. Destinos incríveis esperam por você!`;
        }

        if (profile?.agency_logo_url) {
          ogImage = profile.agency_logo_url;
        }
      }
    } catch {
      // Fallback to generic
    }
  }

  // Enrich quote type
  if (type === "quote" && token) {
    try {
      const { data: quote } = await supabase
        .from("quotes")
        .select("destination, user_id")
        .eq("share_token", token)
        .eq("status", "published")
        .maybeSingle();

      if (quote) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_name, agency_logo_url")
          .eq("user_id", quote.user_id)
          .maybeSingle();

        if (profile?.agency_name) {
          ogTitle = `Orçamento personalizado | ${profile.agency_name}`;
          ogDescription = `Confira seu orçamento personalizado para ${quote.destination}, preparado especialmente por ${profile.agency_name}.`;
        }
        if (profile?.agency_logo_url) {
          ogImage = profile.agency_logo_url;
        }
      }
    } catch {
      // Fallback
    }
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(ogTitle)}</title>

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDescription)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${esc(targetUrl)}" />

  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />

  <meta http-equiv="refresh" content="0;url=${esc(targetUrl)}" />
</head>
<body>
  <p>Redirecionando...</p>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
