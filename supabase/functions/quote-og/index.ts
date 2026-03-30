import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLIC_DOMAIN = "https://www.vitrine.tur.br";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const spaUrl = `${PUBLIC_DOMAIN}/orcamento/${token}`;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Fetch quote
    const { data: quote } = await supabase
      .from("quotes")
      .select("client_name, destination, start_date, end_date, user_id")
      .eq("share_token", token)
      .eq("status", "published")
      .maybeSingle();

    if (!quote) {
      return Response.redirect(spaUrl, 302);
    }

    // Fetch agent profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_name, agency_logo_url")
      .eq("user_id", quote.user_id)
      .maybeSingle();

    const agencyName = profile?.agency_name || "Proposta de Viagem";
    const agencyLogo = profile?.agency_logo_url || `${PUBLIC_DOMAIN}/og-image.png`;
    const ogTitle = `Orçamento personalizado | ${agencyName}`;
    const ogDescription = `Confira seu orçamento personalizado para ${quote.destination}, preparado especialmente por ${agencyName}.`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeAttr(ogTitle)}" />
  <meta property="og:description" content="${escapeAttr(ogDescription)}" />
  <meta property="og:image" content="${escapeAttr(agencyLogo)}" />
  <meta property="og:url" content="${escapeAttr(spaUrl)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(ogTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(ogDescription)}" />
  <meta name="twitter:image" content="${escapeAttr(agencyLogo)}" />

  <!-- Redirect browsers to SPA -->
  <meta http-equiv="refresh" content="0;url=${escapeAttr(spaUrl)}" />
</head>
<body>
  <p>Redirecionando para o orçamento...</p>
  <script>window.location.replace(${JSON.stringify(spaUrl)});</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (_err) {
    return Response.redirect(spaUrl, 302);
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
