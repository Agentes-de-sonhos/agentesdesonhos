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
    console.log("=== GOOGLE DRIVE AUTH START ===");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No valid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized: token não fornecido" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("SUPABASE_URL present:", !!supabaseUrl);
    console.log("SUPABASE_ANON_KEY present:", !!supabaseAnonKey);
    console.log("SERVICE_ROLE_KEY present:", !!serviceRoleKey);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta (Supabase vars)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("User fetch result:", !!user, "Error:", userError?.message);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${userError?.message || "usuário não encontrado"}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData, error: roleError } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    console.log("Role data:", roleData, "Role error:", roleError?.message);

    const isAdmin = !roleError && roleData && roleData.length > 0;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas administradores" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    console.log("GOOGLE_CLIENT_ID present:", !!clientId);
    console.log("GOOGLE_CLIENT_ID value:", clientId ? clientId.substring(0, 15) + "..." : "MISSING");

    if (!clientId) {
      return new Response(JSON.stringify({ error: "GOOGLE_CLIENT_ID não configurado no servidor" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = "https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/google-drive-callback";
    const state = btoa(JSON.stringify({ user_id: user.id }));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    console.log("=== AUTH URL GENERATED ===");
    console.log("Redirect URI:", redirectUri);

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== GOOGLE DRIVE AUTH FATAL ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    return new Response(JSON.stringify({ error: `Erro interno: ${error.message}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
