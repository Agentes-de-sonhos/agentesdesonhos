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
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { operator_id, email, password, responsible_name } = await req.json();

    if (!operator_id || !email || !password) {
      return new Response(JSON.stringify({ error: "operator_id, email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check operator exists and isn't already linked
    const { data: operator, error: opFetchErr } = await adminClient
      .from("tour_operators")
      .select("id, name, user_id")
      .eq("id", operator_id)
      .maybeSingle();

    if (opFetchErr || !operator) {
      return new Response(JSON.stringify({ error: "Operadora não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operator.user_id) {
      return new Response(JSON.stringify({ error: "Esta operadora já possui uma conta de fornecedor vinculada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalName = (responsible_name && responsible_name.trim()) || operator.name;

    // 1. Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: finalName },
    });

    if (createError) {
      console.error("Create user error:", createError);
      const msg = /already\s+been\s+registered/i.test(createError.message)
        ? "Este e-mail já está cadastrado"
        : "Erro ao criar usuário. Verifique os dados e tente novamente.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // 2. Set role to fornecedor (trigger creates 'agente' by default)
    await adminClient.from("user_roles").update({ role: "fornecedor" }).eq("user_id", userId);

    // 3. Upsert profile
    await adminClient.from("profiles").upsert({
      user_id: userId,
      name: finalName,
      agency_name: operator.name,
    });

    // 4. Link operator to this user
    const { error: linkErr } = await adminClient
      .from("tour_operators")
      .update({ user_id: userId })
      .eq("id", operator_id);

    if (linkErr) {
      console.error("Link error:", linkErr);
      return new Response(JSON.stringify({ error: "Conta criada, mas falhou ao vincular à operadora." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, operator_id, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-link-supplier-account error:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
