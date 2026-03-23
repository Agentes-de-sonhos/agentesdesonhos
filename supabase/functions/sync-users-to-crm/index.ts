import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users with their profiles
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 10000 });
    if (usersError) throw usersError;

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const user of users.users) {
      if (!user.email) {
        skipped++;
        continue;
      }

      // Get profile data
      const { data: profile } = await adminClient
        .from("profiles")
        .select("name, phone, agency_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const nome = profile?.name || (user.user_metadata as any)?.name || "Usuário";
      const telefone = profile?.phone || null;
      const empresa = profile?.agency_name || null;

      // Upsert into crm_contacts
      const { error: upsertError, data } = await adminClient
        .from("crm_contacts")
        .upsert(
          {
            nome,
            email: user.email,
            telefone,
            empresa,
            category: "Agente de Viagens",
            status: "novo",
            origem: "plataforma",
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (upsertError) {
        console.error(`Error upserting ${user.email}:`, upsertError.message);
        skipped++;
      } else {
        // We can't easily distinguish insert vs update with upsert, count all as imported
        imported++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, updated, skipped, total: users.users.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
