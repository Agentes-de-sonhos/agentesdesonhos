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
    const { company_name, category, email, password, responsible_name, phone } = await req.json();

    // Validate required fields
    if (!company_name || !email || !password || !responsible_name) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome da empresa, e-mail, senha e nome do responsável." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: responsible_name.trim() },
    });

    if (createError) {
      console.error("Create user error:", createError);
      const msg = /already\s+been\s+registered/i.test(createError.message)
        ? "Este e-mail já está cadastrado."
        : "Erro ao criar conta. Verifique os dados e tente novamente.";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // 2. Set role to fornecedor (trigger creates 'agente', so update it)
    await adminClient
      .from("user_roles")
      .update({ role: "fornecedor" })
      .eq("user_id", userId);

    // 3. Create profile
    await adminClient.from("profiles").upsert({
      user_id: userId,
      name: responsible_name.trim(),
      phone: phone || null,
      agency_name: company_name.trim(),
    });

    // 4. Create tour_operators record linked to user
    const { data: operator, error: opError } = await adminClient
      .from("tour_operators")
      .insert({
        name: company_name.trim(),
        category: category || null,
        user_id: userId,
        is_active: true,
        approval_status: "pending",
      })
      .select("id")
      .single();

    if (opError) {
      console.error("Create operator error:", opError);
      return new Response(
        JSON.stringify({ error: "Conta criada, mas houve um erro ao criar o perfil da empresa." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, operator_id: operator.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("supplier-register error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
