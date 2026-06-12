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
  const targetUrlParam = url.searchParams.get("url");
  const token = url.searchParams.get("token");
  const slug = url.searchParams.get("slug");

  if (!type || !targetUrlParam) {
    return new Response("Missing required params", { status: 400 });
  }

  // Guard: never allow og:url / canonical to be a bare app/base URL.
  // The shared link MUST always be the personalized public quote URL
  // (with slug + access code, or legacy /orcamento/:token).
  const code = url.searchParams.get("code");
  const isPersonalizedQuoteUrl = (u: string): boolean => {
    try {
      const parsed = new URL(u);
      const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
      if (!path) return false; // base domain
      // Legacy token route: /orcamento/:token
      if (/^orcamento\/[^/]+$/.test(path)) return true;
      // New format: /:slug/:code
      if (/^[^/]+\/[^/]+$/.test(path)) return true;
      return false;
    } catch {
      return false;
    }
  };

  let targetUrl = targetUrlParam;
  if (type === "quote" && !isPersonalizedQuoteUrl(targetUrl)) {
    // Rebuild the canonical personalized URL from slug/code or token
    const base = "https://seuorcamento.tur.br";
    if (slug && code) {
      targetUrl = `${base}/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
    } else if (token) {
      targetUrl = `${base}/orcamento/${encodeURIComponent(token)}`;
    }
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

  // Enrich quote type (supports legacy ?token=... and new ?slug=...&code=...)
  if (type === "quote") {
    try {
      let quote: any = null;

      if (code) {
        const { data } = await supabase
          .from("quotes")
          .select("destination, start_date, end_date, client_name, user_id, destination_intro_images")
          .eq("public_access_code", code)
          .eq("status", "published")
          .maybeSingle();
        quote = data;
      } else if (token) {
        const { data } = await supabase
          .from("quotes")
          .select("id, destination, start_date, end_date, client_name, user_id, destination_intro_images")
          .eq("share_token", token)
          .eq("status", "published")
          .maybeSingle();
        quote = data;
      }

      if (quote) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_name, agency_logo_url")
          .eq("user_id", quote.user_id)
          .maybeSingle();

        const destination = (quote.destination || "").trim();
        const agency = (profile?.agency_name || "").trim();

        // Title: prioritize destination + agency
        if (destination && agency) {
          ogTitle = `Orçamento de viagem para ${destination} | ${agency}`;
        } else if (destination) {
          ogTitle = `Orçamento de viagem para ${destination}`;
        } else if (agency) {
          ogTitle = `Orçamento personalizado | ${agency}`;
        }

        // Description: include dates when available
        const period = formatPeriod(quote.start_date, quote.end_date);
        if (period && destination) {
          ogDescription = `Confira os detalhes da sua viagem para ${destination}: ${period}, serviços incluídos e investimento.`;
        } else if (destination) {
          ogDescription = `Confira os detalhes da sua viagem para ${destination}: serviços incluídos e investimento.`;
        } else if (agency) {
          ogDescription = `Confira seu orçamento personalizado preparado por ${agency}.`;
        }

        // Image: cover/destination intro > first service image > agency logo > default
        const intro = Array.isArray(quote.destination_intro_images) ? quote.destination_intro_images : [];
        const coverImage = intro.find((u: any) => typeof u === "string" && u.startsWith("http"));
        if (coverImage) {
          ogImage = coverImage;
          twitterCard = "summary_large_image";
        } else if (quote.id) {
          // Try to find first service image as a secondary fallback (legacy token path)
          try {
            const { data: svc } = await supabase
              .from("quote_services")
              .select("image_url, image_urls")
              .eq("quote_id", quote.id)
              .order("order_index", { ascending: true })
              .limit(5);
            const firstImg = (svc || [])
              .flatMap((s: any) => [s.image_url, ...((s.image_urls as string[]) || [])])
              .find((u: any) => typeof u === "string" && u.startsWith("http"));
            if (firstImg) {
              ogImage = firstImg;
              twitterCard = "summary_large_image";
            } else if (profile?.agency_logo_url) {
              ogImage = profile.agency_logo_url;
            }
          } catch {
            if (profile?.agency_logo_url) ogImage = profile.agency_logo_url;
          }
        } else if (profile?.agency_logo_url) {
          ogImage = profile.agency_logo_url;
        }
      }
    } catch {
      // Fallback to generic
    }
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(ogTitle)}</title>
  <link rel="canonical" href="${esc(targetUrl)}" />

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

function formatPeriod(start?: string | null, end?: string | null): string {
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `período de ${s} a ${e}`;
  if (s) return `a partir de ${s}`;
  return "";
}
