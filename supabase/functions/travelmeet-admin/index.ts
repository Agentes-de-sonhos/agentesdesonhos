import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const TRAVELMEET_ENDPOINT = "https://yapuxdnxbvsvikcdrzmu.supabase.co/functions/v1/admin-suppliers";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminApiKey = Deno.env.get("ADMIN_API_KEY");
    if (!adminApiKey) {
      return new Response(JSON.stringify({ error: "ADMIN_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") || "pending_approval";
      const limit = url.searchParams.get("limit") || "50";
      const offset = url.searchParams.get("offset") || "0";

      const resp = await fetch(`${TRAVELMEET_ENDPOINT}?status=${status}&limit=${limit}&offset=${offset}`, {
        headers: { "x-admin-api-key": adminApiKey },
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const resp = await fetch(TRAVELMEET_ENDPOINT, {
        method: "POST",
        headers: { "x-admin-api-key": adminApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
