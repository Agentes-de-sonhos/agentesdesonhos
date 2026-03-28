import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // Check admin role
    const { data: roleData } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, is_active } = await req.json();
    if (!user_id || typeof is_active !== "boolean") {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent admin from deactivating themselves
    if (user_id === caller.id && !is_active) {
      return new Response(JSON.stringify({ error: "Você não pode desativar sua própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Update subscription status
    const { error: updateError } = await adminClient
      .from("subscriptions")
      .update({ is_active })
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error("Erro ao atualizar status: " + updateError.message);
    }

    // If deactivating: force sign out from ALL sessions
    if (!is_active) {
      const { error: signOutError } = await adminClient.auth.admin.signOut(user_id, "global");
      if (signOutError) {
        console.error("Error signing out user:", signOutError);
        // Don't fail the request - status was already updated
      }
    }

    // Log the action
    await adminClient.from("admin_action_logs").insert({
      admin_user_id: caller.id,
      target_user_id: user_id,
      action: is_active ? "user_activated" : "user_deactivated",
      details: { is_active },
    });

    return new Response(
      JSON.stringify({ success: true, is_active }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-toggle-user-status error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
