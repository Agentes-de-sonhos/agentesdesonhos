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
        status: 200,
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
        status: 200,
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
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${caller.id} forcing logout for user ${user_id}`);

    // Strategy: ban user for 1 second to invalidate all sessions, then unban
    const { error: banError } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: "1s",
    });

    if (banError) {
      console.error("Ban error:", banError);
      return new Response(JSON.stringify({ error: `Erro ao invalidar sessões: ${banError.message}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wait briefly then unban
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { error: unbanError } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: "none",
    });

    if (unbanError) {
      console.error("Unban error:", unbanError);
      // Still return success since sessions were invalidated
    }

    // Clear user presence so they appear offline immediately
    await adminClient
      .from("user_presence")
      .update({ is_online: false, last_active_at: new Date(0).toISOString() })
      .eq("user_id", user_id);

    // Also end any active sessions in user_sessions
    await adminClient
      .from("user_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .is("ended_at", null);

    console.log(`Successfully forced logout for user ${user_id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-force-logout error:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
