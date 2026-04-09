import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate admin caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem acessar este recurso" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url: inputUrl } = await req.json();
    if (!inputUrl || typeof inputUrl !== "string") {
      return new Response(JSON.stringify({ error: "URL é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the URL to extract resource info
    const resolved = await resolveUrl(adminClient, inputUrl.trim());

    if (resolved.error) {
      return new Response(JSON.stringify({ error: resolved.error }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log access
    await adminClient.from("admin_resource_access_logs").insert({
      admin_user_id: callerUser.id,
      resource_type: resolved.type,
      resource_id: resolved.resource_id,
      resource_owner_id: resolved.owner_id,
      action: "view",
      url_input: inputUrl.substring(0, 500),
      details: { resolved_via: resolved.resolved_via },
    });

    return new Response(JSON.stringify({
      type: resolved.type,
      resource_id: resolved.resource_id,
      owner_id: resolved.owner_id,
      data: resolved.data,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-resolve-resource error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao resolver recurso" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ResolvedResource {
  type: string;
  resource_id: string;
  owner_id: string | null;
  data: Record<string, unknown>;
  resolved_via: string;
  error?: string;
}

async function resolveUrl(
  adminClient: ReturnType<typeof createClient>,
  inputUrl: string
): Promise<ResolvedResource & { error?: string }> {
  let url: URL;
  try {
    // Handle relative paths
    if (inputUrl.startsWith("/")) {
      url = new URL(inputUrl, "https://placeholder.com");
    } else {
      url = new URL(inputUrl);
    }
  } catch {
    return { error: "URL inválida", type: "", resource_id: "", owner_id: null, data: {}, resolved_via: "" };
  }

  const hostname = url.hostname;
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);

  // Pattern: /c/{slug} — legacy carteira
  if (segments.length === 2 && segments[0] === "c") {
    const slug = segments[1];
    const { data: trip } = await adminClient
      .from("trips")
      .select("id, user_id, client_name, destination, status, slug, start_date, end_date")
      .eq("slug", slug)
      .maybeSingle();
    if (trip) {
      return {
        type: "trip",
        resource_id: trip.id,
        owner_id: trip.user_id,
        data: trip,
        resolved_via: "slug",
      };
    }
    return { error: "Carteira não encontrada", type: "", resource_id: "", owner_id: null, data: {}, resolved_via: "" };
  }

  // Pattern: /{agencySlug}/{accessCode} — domain-aware or main domain
  if (segments.length === 2) {
    const [agencySlug, accessCode] = segments;

    // Determine type by domain
    const isDomainQuote = hostname.includes("seuorcamento.tur.br");
    const isDomainItinerary = hostname.includes("seuroteiro.tur.br");
    const isDomainCarteira = hostname.includes("carteiradigital.tur.br");

    // Try quote
    if (isDomainQuote || (!isDomainItinerary && !isDomainCarteira)) {
      const { data: quote } = await adminClient
        .from("quotes")
        .select("id, user_id, client_name, destination, status, total_amount, public_access_code")
        .eq("public_access_code", accessCode)
        .maybeSingle();
      if (quote) {
        // Validate agency slug
        const ownerSlug = await getAgencySlug(adminClient, quote.user_id);
        if (ownerSlug === agencySlug) {
          return {
            type: "quote",
            resource_id: quote.id,
            owner_id: quote.user_id,
            data: quote,
            resolved_via: "public_access_code",
          };
        }
      }
    }

    // Try itinerary
    if (isDomainItinerary || (!isDomainQuote && !isDomainCarteira)) {
      const { data: itin } = await adminClient
        .from("itineraries")
        .select("id, user_id, destination, status, start_date, end_date, public_access_code")
        .eq("public_access_code", accessCode)
        .maybeSingle();
      if (itin) {
        const ownerSlug = await getAgencySlug(adminClient, itin.user_id);
        if (ownerSlug === agencySlug) {
          return {
            type: "itinerary",
            resource_id: itin.id,
            owner_id: itin.user_id,
            data: itin,
            resolved_via: "public_access_code",
          };
        }
      }
    }

    // Try trip/carteira
    if (isDomainCarteira || (!isDomainQuote && !isDomainItinerary)) {
      const { data: trip } = await adminClient
        .from("trips")
        .select("id, user_id, client_name, destination, status, slug, start_date, end_date, public_access_code")
        .eq("public_access_code", accessCode)
        .maybeSingle();
      if (trip) {
        const ownerSlug = await getAgencySlug(adminClient, trip.user_id);
        if (ownerSlug === agencySlug) {
          return {
            type: "trip",
            resource_id: trip.id,
            owner_id: trip.user_id,
            data: trip,
            resolved_via: "public_access_code",
          };
        }
      }
    }

    return { error: "Recurso não encontrado para esta URL", type: "", resource_id: "", owner_id: null, data: {}, resolved_via: "" };
  }

  // Pattern: /contato/{slug} or contato.tur.br/{slug} — business card
  if (segments.length === 1 && (hostname.includes("contato.tur.br") || path.startsWith("/contato/"))) {
    const slug = segments[0];
    const { data: card } = await adminClient
      .from("business_cards")
      .select("id, user_id, name, slug, agency_name, is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (card) {
      return {
        type: "card",
        resource_id: card.id,
        owner_id: card.user_id,
        data: card,
        resolved_via: "card_slug",
      };
    }
  }

  // Single segment on contato domain
  if (segments.length === 1 && hostname.includes("contato.tur.br")) {
    const slug = segments[0];
    const { data: card } = await adminClient
      .from("business_cards")
      .select("id, user_id, name, slug, agency_name, is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (card) {
      return {
        type: "card",
        resource_id: card.id,
        owner_id: card.user_id,
        data: card,
        resolved_via: "card_slug",
      };
    }
  }

  return { error: "Não foi possível identificar o recurso a partir desta URL", type: "", resource_id: "", owner_id: null, data: {}, resolved_via: "" };
}

async function getAgencySlug(client: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data } = await client
    .from("profiles")
    .select("agency_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.agency_name) return "";

  return data.agency_name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
