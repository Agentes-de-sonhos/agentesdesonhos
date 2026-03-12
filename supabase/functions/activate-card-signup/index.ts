import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 30;
const BLOCK_DURATION_MINUTES = 15;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 20);

const extractIpAddress = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  return forwarded.split(",")[0]?.trim().slice(0, 64) || "unknown";
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
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

    if (name.length < 2 || name.length > 100) {
      return jsonResponse({ error: "Nome inválido." }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: "E-mail inválido." }, 400);
    }

    if (password.length < 6 || password.length > 128) {
      return jsonResponse({ error: "A senha deve ter entre 6 e 128 caracteres." }, 400);
    }

    const ipAddress = extractIpAddress(req);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: attemptRecord, error: attemptError } = await adminClient
      .from("activation_signup_attempts")
      .select("attempts, window_started_at, blocked_until")
      .eq("email", email)
      .eq("ip_address", ipAddress)
      .maybeSingle();

    if (attemptError) {
      console.error("Erro ao buscar tentativas de cadastro:", attemptError);
      return jsonResponse({ error: "Não foi possível validar tentativas de cadastro." }, 500);
    }

    let currentAttempts = attemptRecord?.attempts ?? 0;
    let windowStartedAt = attemptRecord?.window_started_at ?? nowIso;

    if (attemptRecord?.window_started_at) {
      const windowMs = new Date(attemptRecord.window_started_at).getTime();
      if (nowMs - windowMs > ATTEMPT_WINDOW_MINUTES * 60 * 1000) {
        currentAttempts = 0;
        windowStartedAt = nowIso;
      }
    }

    if (attemptRecord?.blocked_until) {
      const blockedUntilMs = new Date(attemptRecord.blocked_until).getTime();
      if (blockedUntilMs > nowMs) {
        const minutesLeft = Math.max(1, Math.ceil((blockedUntilMs - nowMs) / 60000));
        return jsonResponse(
          { error: `Limite de 5 tentativas atingido. Tente novamente em ${minutesLeft} minuto(s).` },
          429,
        );
      }
    }

    const registerFailedAttempt = async (errorMessage: string) => {
      const nextAttempts = currentAttempts + 1;
      const shouldBlock = nextAttempts >= MAX_FAILED_ATTEMPTS;
      const blockedUntil = shouldBlock
        ? new Date(nowMs + BLOCK_DURATION_MINUTES * 60 * 1000).toISOString()
        : null;

      const { error } = await adminClient.from("activation_signup_attempts").upsert(
        {
          email,
          ip_address: ipAddress,
          attempts: nextAttempts,
          window_started_at: windowStartedAt,
          blocked_until: blockedUntil,
          last_error: errorMessage,
        },
        { onConflict: "email,ip_address" },
      );

      if (error) {
        console.error("Erro ao registrar tentativa de cadastro:", error);
      }
    };

    const { data: newUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        target_plan: "cartao_digital",
      },
    });

    if (createUserError) {
      const isAlreadyRegistered = /already\s+been\s+registered/i.test(createUserError.message);
      const message = isAlreadyRegistered
        ? "Este e-mail já está cadastrado. Faça login no app."
        : createUserError.message;

      await registerFailedAttempt(message);

      return jsonResponse({ error: message }, isAlreadyRegistered ? 409 : 400);
    }

    const userId = newUserData.user?.id;

    if (!userId) {
      await registerFailedAttempt("Não foi possível criar o usuário.");
      return jsonResponse({ error: "Não foi possível criar o usuário." }, 500);
    }

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

    const { error: subscriptionError } = await adminClient.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "cartao_digital",
        is_active: true,
      },
      { onConflict: "user_id" },
    );

    if (subscriptionError) {
      console.error("Erro ao salvar assinatura no cadastro de ativação:", subscriptionError);
      return jsonResponse({ error: "Conta criada, mas houve um erro ao ativar o plano. Tente entrar no app novamente." }, 500);
    }

    await adminClient
      .from("activation_signup_attempts")
      .delete()
      .eq("email", email)
      .eq("ip_address", ipAddress);

    return jsonResponse({ success: true, user_id: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, 500);
  }
});
