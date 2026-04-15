import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRAVELMEET_ENDPOINT = "https://yapuxdnxbvsvikcdrzmu.supabase.co/functions/v1/admin-suppliers";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = user.id;

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
      const requestedStatus = url.searchParams.get("status") || "pending";
      const status = requestedStatus === "pending_approval" ? "pending" : requestedStatus;
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

      // If approval was successful, sync to local tour_operators table
      if (resp.ok && body.action === "approve") {
        try {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );

          // Fetch supplier details from TravelMeet to get full data
          const detailResp = await fetch(`${TRAVELMEET_ENDPOINT}?status=approved&limit=1&search_id=${body.id}`, {
            headers: { "x-admin-api-key": adminApiKey },
          });
          
          // Use data from the approval response or fetch details
          const supplierData = data.supplier || data;
          
          const supplierName = supplierData.company_name || supplierData.brand_name || "Fornecedor TravelMeet";
          
          // Check if already exists by name to avoid duplicates
          const { data: existing } = await serviceClient
            .from("tour_operators")
            .select("id")
            .eq("name", supplierName)
            .maybeSingle();

          if (!existing) {
            const newOperator: Record<string, unknown> = {
              name: supplierName,
              category: supplierData.business_category || "Outros",
              website: supplierData.website || null,
              logo_url: supplierData.logo_url || null,
              commercial_contacts: supplierData.commercial_email 
                ? `${supplierData.contact_person_name || ""} - ${supplierData.commercial_email}`.trim()
                : supplierData.contact_person_name || null,
              specialties: supplierData.short_description || null,
              is_active: true,
            };

            await serviceClient.from("tour_operators").insert(newOperator);
            
            // Add sync info to response
            data._synced_to_map = true;
          } else {
            data._synced_to_map = false;
            data._sync_note = "Já existe no Mapa do Turismo";
          }
        } catch (syncErr) {
          console.error("Sync to tour_operators failed:", syncErr);
          data._sync_error = syncErr.message;
        }
      }

      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
