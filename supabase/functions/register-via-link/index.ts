import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limiting: 5 registrations per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, 'register-via-link', 5, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const { token, name, email, password, phone } = await req.json();

    if (!token || !name || !email || !password) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the registration link
    const { data: link, error: linkError } = await adminClient
      .from("registration_links")
      .select("*")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Link de cadastro inválido ou não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if link is still valid
    if (link.uses_count >= link.max_uses) {
      return new Response(JSON.stringify({ error: "Este link de cadastro já foi utilizado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Este link de cadastro expirou" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, target_plan: link.plan },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este e-mail já está cadastrado"
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Create profile
    await adminClient.from("profiles").upsert({
      user_id: userId,
      name,
      phone: phone || null,
    });

    // Set role if not default
    if (link.role && link.role !== "agente") {
      await adminClient
        .from("user_roles")
        .update({ role: link.role })
        .eq("user_id", userId);
    }

    // Set plan if not default
    if (link.plan && link.plan !== "essencial") {
      await adminClient
        .from("subscriptions")
        .update({ plan: link.plan })
        .eq("user_id", userId);
    }

    // Increment uses_count
    await adminClient
      .from("registration_links")
      .update({ uses_count: link.uses_count + 1, updated_at: new Date().toISOString() })
      .eq("id", link.id);

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
