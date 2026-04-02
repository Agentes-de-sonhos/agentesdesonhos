import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOMAINS: Record<string, string> = {
  "seuorcamento.tur.br": "quote",
  "seuroteiro.tur.br": "itinerary",
  "carteiradigital.tur.br": "wallet",
};

const OG_IMAGE = "https://www.vitrine.tur.br/favicon.png";

const OG_CONTENT: Record<string, { title: string; description: string }> = {
  quote: {
    title: "Seu orçamento de viagem chegou 💰",
    description: "Confira todos os detalhes da sua viagem e aprove sua próxima experiência.",
  },
  itinerary: {
    title: "Seu roteiro de viagem está pronto ✈️",
    description: "Acesse seu roteiro completo e viaje com tudo organizado na palma da mão.",
  },
  wallet: {
    title: "Sua viagem organizada em um só lugar 🎒",
    description: "Acesse seus vouchers, ingressos e documentos de forma simples e segura.",
  },
  card: {
    title: "Seu contato de viagem digital 📲",
    description: "Tenha acesso rápido ao seu agente e informações importantes da sua viagem.",
  },
  showcase: {
    title: "Conheça esta agência de viagens 🌍",
    description: "Descubra experiências incríveis e fale com especialistas para sua próxima viagem.",
  },
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // quote | itinerary | wallet | card | showcase
  const targetUrl = url.searchParams.get("url"); // full SPA URL to redirect to
  const token = url.searchParams.get("token"); // optional: share_token for enriched preview

  if (!type || !targetUrl) {
    return new Response("Missing required params", { status: 400 });
  }

  const content = OG_CONTENT[type] || OG_CONTENT.quote;
  let ogTitle = content.title;
  let ogDescription = content.description;
  let ogImage = OG_IMAGE;

  // Try to enrich with real data if token provided
  if (token) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } }
      );

      if (type === "quote") {
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
      }
    } catch {
      // Fallback to generic content
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
  <meta property="og:url" content="${esc(targetUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
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
