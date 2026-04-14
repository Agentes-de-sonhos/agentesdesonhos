import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 20);

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;

const VALID_PLANS = ["start", "profissional", "premium"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  // Rate limiting: 5 activations per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = await checkRateLimit(clientIP, 'activate-card-signup', 5, 60);
  if (!rateCheck.allowed) {
    return rateLimitResponse(corsHeaders, rateCheck.retryAfterMs);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: "Configuração do servidor incompleta." }, 500);
    }

    const payload = await req.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Dados inválidos para cadastro." }, 400);
    }

    const name = String(payload.name ?? "").trim();
    const email = normalizeEmail(String(payload.email ?? ""));
    const password = String(payload.password ?? "");
    const phone = normalizePhone(String(payload.phone ?? ""));
    const activationToken = String(payload.activation_token ?? "").trim();

    if (!activationToken) {
      return jsonResponse({ error: "Token de ativação é obrigatório." }, 400);
    }

    if (name.length < 2 || name.length > 100) {
      return jsonResponse({ error: "Nome inválido." }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: "E-mail inválido." }, 400);
    }

    if (password.length < 6 || password.length > 128) {
      return jsonResponse({ error: "A senha deve ter entre 6 e 128 caracteres." }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate activation token
    const { data: activation, error: tokenError } = await adminClient
      .from("card_activations")
      .select("*")
      .eq("activation_token", activationToken)
      .eq("used", false)
      .single();

    if (tokenError || !activation) {
      return jsonResponse({ error: "Token de ativação inválido ou já utilizado." }, 400);
    }

    // Check expiration
    if (new Date(activation.expires_at) < new Date()) {
      return jsonResponse({ error: "Este link de ativação expirou. Solicite um novo." }, 400);
    }

    // Verify email matches the payment email
    if (activation.email !== email) {
      return jsonResponse({ error: "O e-mail informado não corresponde ao e-mail do pagamento." }, 400);
    }

    // Determine plan from activation record (backend-controlled, not user-controlled)
    const activationPlan = VALID_PLANS.includes(activation.plan) ? activation.plan : "profissional";

    // Create user with correct plan
    const { data: newUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        target_plan: activationPlan,
      },
    });

    if (createUserError) {
      console.error("Activate card signup - create user error:", createUserError);
      const isAlreadyRegistered = /already\s+been\s+registered/i.test(createUserError.message);
      const message = isAlreadyRegistered
        ? "Este e-mail já está cadastrado. Faça login no app."
        : "Erro ao criar conta. Verifique os dados e tente novamente.";

      return jsonResponse({ error: message }, isAlreadyRegistered ? 409 : 400);
    }

    const userId = newUserData.user?.id;

    if (!userId) {
      return jsonResponse({ error: "Não foi possível criar o usuário." }, 500);
    }

    // Save profile
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        user_id: userId,
        name,
        phone,
        has_password: true,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      console.error("Erro ao salvar perfil no cadastro de ativação:", profileError);
    }

    // Create subscription with the correct plan from the activation record
    const { error: subscriptionError } = await adminClient.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: activationPlan,
        is_active: true,
        stripe_customer_id: activation.stripe_customer_id || null,
        stripe_subscription_id: activation.stripe_subscription_id || null,
      },
      { onConflict: "user_id" },
    );

    if (subscriptionError) {
      console.error("Erro ao salvar assinatura no cadastro de ativação:", subscriptionError);
      return jsonResponse({ error: "Conta criada, mas houve um erro ao ativar o plano. Tente entrar no app novamente." }, 500);
    }

    // Mark token as used
    const { error: markUsedError } = await adminClient
      .from("card_activations")
      .update({ used: true })
      .eq("activation_token", activationToken);

    if (markUsedError) {
      console.error("Erro ao marcar token como usado:", markUsedError);
    }

    return jsonResponse({ success: true, user_id: userId, plan: activationPlan });
  } catch (error) {
    console.error("activate-card-signup error:", error);
    return jsonResponse({ error: "Erro ao processar ativação." }, 500);
  }
});