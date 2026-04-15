import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRAVELMEET_ENDPOINT = "https://yapuxdnxbvsvikcdrzmu.supabase.co/functions/v1/admin-suppliers";

const normalizeTravelMeetStatus = (status?: string | null) => {
  if (!status || status === "pending") return "pending_approval";
  return status;
};

const getString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

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
      const requestedStatus = url.searchParams.get("status");
      const status = normalizeTravelMeetStatus(requestedStatus);
      const limit = url.searchParams.get("limit") || "50";
      const offset = url.searchParams.get("offset") || "0";

      const resp = await fetch(`${TRAVELMEET_ENDPOINT}?status=${status}&limit=${limit}&offset=${offset}`, {
        headers: { "x-admin-api-key": adminApiKey },
      });
      const data = await resp.json();
      console.log("travelmeet-admin GET", { requestedStatus, forwardedStatus: status, total: data?.total, returned: Array.isArray(data?.suppliers) ? data.suppliers.length : 0 });
      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const resp = await fetch(TRAVELMEET_ENDPOINT, {
        method: "POST",
        headers: { "x-admin-api-key": adminApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ id: body.id, action: body.action }),
      });
      const data = await resp.json();

      if (resp.ok && body.action === "approve") {
        try {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );

          const supplierData = (body.supplier && typeof body.supplier === "object")
            ? body.supplier
            : (data?.supplier && typeof data.supplier === "object")
              ? data.supplier
              : data;

          const supplierName = getString(supplierData?.company_name) || getString(supplierData?.brand_name) || "Fornecedor TravelMeet";
          const contactPerson = getString(supplierData?.contact_person_name);
          const commercialEmail = getString(supplierData?.commercial_email);

          const { data: existing } = await serviceClient
            .from("tour_operators")
            .select("id")
            .eq("name", supplierName)
            .maybeSingle();

          if (!existing) {
            const newOperator: Record<string, unknown> = {
              name: supplierName,
              category: getString(supplierData?.business_category) || "Outros",
              website: getString(supplierData?.website),
              logo_url: getString(supplierData?.logo_url),
              commercial_contacts: commercialEmail
                ? [contactPerson, commercialEmail].filter(Boolean).join(" - ")
                : contactPerson,
              specialties: getString(supplierData?.short_description),
              is_active: true,
            };

            const { data: insertedOperator, error: insertError } = await serviceClient
              .from("tour_operators")
              .insert(newOperator)
              .select("id")
              .single();

            if (insertError) throw insertError;

            data._synced_to_map = true;
            data._sync_operator_id = insertedOperator.id;
            console.log("travelmeet-admin sync success", { supplierName, operatorId: insertedOperator.id });
          } else {
            data._synced_to_map = false;
            data._sync_note = "Já existe no Mapa do Turismo";
            console.log("travelmeet-admin sync skipped", { supplierName, existingOperatorId: existing.id });
          }
        } catch (syncErr) {
          console.error("Sync to tour_operators failed:", syncErr);
          data._sync_error = syncErr instanceof Error ? syncErr.message : "Erro desconhecido ao sincronizar";
        }
      }

      return new Response(JSON.stringify(data), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
