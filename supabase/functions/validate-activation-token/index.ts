import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta." }, 500);
    }

    const payload = await req.json().catch(() => null);
    const token = String(payload?.token ?? "").trim();

    if (!token) {
      return jsonResponse({ error: "Token não fornecido." }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: activation, error: queryError } = await adminClient
      .from("card_activations")
      .select("email, used, expires_at, plan")
      .eq("activation_token", token)
      .single();

    if (queryError || !activation) {
      return jsonResponse({ valid: false, error: "Token de ativação inválido ou já utilizado." });
    }

    if (activation.used) {
      return jsonResponse({ valid: false, error: "Este link de ativação já foi utilizado." });
    }

    if (new Date(activation.expires_at) < new Date()) {
      return jsonResponse({ valid: false, error: "Este link de ativação expirou." });
    }

    return jsonResponse({ valid: true, email: activation.email, plan: activation.plan || "profissional" });
  } catch (error) {
    console.error("validate-activation-token error:", error);
    return jsonResponse({ error: "Erro ao validar token." }, 500);
  }
});