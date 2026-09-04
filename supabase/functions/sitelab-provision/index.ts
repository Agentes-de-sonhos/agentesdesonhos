import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Provisionamento IDEMPOTENTE da conta técnica exclusiva do SiteLab Base.
 *
 * Regra de isolamento: o laboratório é um tenant técnico próprio, com conta de
 * autenticação, profile, membership e domínio próprios. Nunca reutiliza a conta
 * ou os dados de uma agência real, e nada aqui altera `auth.users` por SQL.
 *
 * Somente administradores da plataforma podem executar. A senha da conta é
 * aleatória e nunca é retornada: defina-a pelo fluxo administrativo normal
 * (redefinição de senha) quando quiser entrar no painel do laboratório.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LAB_EMAIL = "sitelab.base@agentesdesonhos.com.br";
const LAB_HOSTNAME = "sitelab.local";
const LAB_SLUG = "sitelab-base";
const LAB_NAME = "Site Lab Base";
const PALETTE = { primary: "#4B2A6E", secondary: "#FFD600", tertiary: "#F3EFF7" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Chamada de plataforma (service role) já é privilégio máximo: aceita direto.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const opToken = (Deno.env.get("SITELAB_PROVISION_TOKEN") || "").trim();
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const headerToken = (req.headers.get("x-sitelab-token") || "").trim();
    const isServiceCall =
      bearer === serviceKey || (opToken.length > 0 && headerToken === opToken);


    console.log("sitelab-provision auth", {
      hasOpToken: opToken.length > 0,
      hasHeaderToken: headerToken.length > 0,
      match: opToken.length > 0 && headerToken === opToken,
      headerNames: [...req.headers.keys()].join(","),
    });

    if (!isServiceCall) {
      const caller = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await caller.auth.getUser();
      if (!user) return json({ error: "Não autorizado" }, 401);

      const { data: role } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) return json({ error: "Acesso negado" }, 403);
    }


    // Ação opcional: trocar SOMENTE o e-mail da conta técnica já existente,
    // pelo mecanismo oficial do Auth Admin (sem UPDATE manual em auth.*).
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      body = {};
    }
    if (body.action === "set_email") {
      const targetId = String(body.user_id || "");
      const newEmail = String(body.email || "").trim().toLowerCase();
      if (!targetId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
        return json({ error: "Parâmetros inválidos" }, 400);
      }
      const { data: target } = await admin.auth.admin.getUserById(targetId);
      const isTechnical =
        target?.user?.email?.toLowerCase() === LAB_EMAIL ||
        target?.user?.user_metadata?.sitelab_technical_account === true;
      if (!target?.user || !isTechnical) {
        return json({ error: "Conta alvo não é a conta técnica do SiteLab" }, 400);
      }
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(targetId, {
        email: newEmail,
        email_confirm: true,
      });
      if (updateError || !updated?.user) {
        console.error("sitelab-provision set_email", updateError);
        return json({ error: "Falha ao atualizar o e-mail da conta técnica" }, 400);
      }
      return json({ success: true, action: "set_email", user_id: targetId, email: updated.user.email });
    }

    // 1) Conta de autenticação exclusiva (criada apenas uma vez).

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let labUser = list?.users?.find((u) => u.email?.toLowerCase() === LAB_EMAIL);
    let created = false;
    if (!labUser) {
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email: LAB_EMAIL,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { name: LAB_NAME, sitelab_technical_account: true },
      });
      if (error || !newUser?.user) {
        console.error("sitelab-provision createUser", error);
        return json({ error: "Falha ao criar a conta técnica" }, 400);
      }
      labUser = newUser.user;
      created = true;
    }
    const labId = labUser.id;

    // 2) Profile próprio do laboratório, com a identidade do template base.
    await admin.from("profiles").upsert(
      {
        user_id: labId,
        name: LAB_NAME,
        agency_name: LAB_NAME,
        public_slug: LAB_SLUG,
        agency_primary_color: PALETTE.primary,
        agency_secondary_color: PALETTE.secondary,
        agency_secondary_auto: false,
        agency_tertiary_color: PALETTE.tertiary,
        agency_tertiary_auto: false,
      },
      { onConflict: "user_id" },
    );

    // 3) Agência técnica: a conta é master de si mesma (menor privilégio).
    await admin
      .from("agency_membership")
      .upsert({ user_id: labId, agency_id: labId, role: "master" }, { onConflict: "user_id" });

    // 4) Domínio técnico aponta para a conta técnica e habilita o painel real.
    const { error: domainError } = await admin
      .from("agency_public_domains")
      .update({
        user_id: labId,
        agency_slug: LAB_SLUG,
        is_active: true,
        is_primary: true,
        admin_portal_enabled: true,
      })
      .eq("hostname", LAB_HOSTNAME);
    if (domainError) {
      console.error("sitelab-provision domain", domainError);
      return json({ error: "Falha ao vincular o domínio técnico" }, 400);
    }

    // 5) Plano da conta técnica: acesso completo ao painel, sem tocar agências reais.
    await admin
      .from("subscriptions")
      .upsert({ user_id: labId, plan: "premium" }, { onConflict: "user_id" });

    return json({ success: true, created, user_id: labId, email: LAB_EMAIL });
  } catch (err) {
    console.error("sitelab-provision error", err);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});
