import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Provisionamento IDEMPOTENTE do tenant de prévia Casa Nova Tur.
 *
 * Regras:
 * - tenant NORMAL e isolado: conta própria, profile próprio, membership master
 *   de si mesma, domínio TÉCNICO (`casanovatur.demo.local`). O domínio real
 *   nunca é vinculado aqui;
 * - nunca lê nem altera dados de agências reais;
 * - somente administradores da plataforma (ou chamada service role) executam;
 * - reexecutar não duplica nada; `action: "reset_password"` gera nova senha
 *   temporária e `action: "cleanup"` remove SOMENTE os dados deste tenant;
 * - a senha temporária é retornada apenas na resposta da chamada que a gera e
 *   nunca é persistida em código, seed ou log.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_EMAIL = "contato@casanovatour.com.br";
const TENANT_HOSTNAME = "casanovatur.demo.local";
const TENANT_SLUG = "casa-nova-tur";
const TENANT_NAME = "Casa Nova Tur";
const PALETTE = { primary: "#12472B", secondary: "#17A34A", tertiary: "#E8F5EC" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Senha temporária forte (não persistida em nenhum artefato do projeto). */
function strongPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Datas futuras coerentes (offset em dias a partir de hoje). */
function futureDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const isServiceCall = authHeader.replace(/^Bearer\s+/i, "").trim() === serviceKey;

    /**
     * Token de bootstrap do provisionamento (Project Settings → Secrets).
     * Existe porque este tenant de prévia precisa ser criado sem uma sessão
     * administrativa interativa. Ele só habilita ESTA função, cujo escopo é
     * fixo (e-mail, host e slug constantes). Pode ser removido do projeto
     * depois da prévia sem afetar nada.
     */
    const expectedToken = (Deno.env.get("CASANOVA_PROVISION_TOKEN") || "").trim();
    const providedToken = (req.headers.get("x-provision-token") || "").trim();
    const isTokenCall =
      expectedToken.length >= 24 &&
      providedToken.length === expectedToken.length &&
      providedToken === expectedToken;

    if (!isServiceCall && !isTokenCall) {
      if (!authHeader) return json({ error: "Não autorizado" }, 401);
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

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      body = {};
    }
    const action = String(body.action || "provision");

    // Conta do tenant (criada apenas uma vez).
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let tenantUser = list?.users?.find((u) => u.email?.toLowerCase() === TENANT_EMAIL);

    if (action === "cleanup") {
      if (!tenantUser) return json({ success: true, cleaned: false });
      const id = tenantUser.id;
      await admin.from("operations").delete().eq("user_id", id);
      await admin.from("opportunities").delete().eq("user_id", id);
      await admin.from("clients").delete().eq("user_id", id);
      await admin
        .from("agency_public_domains")
        .update({ is_active: false, admin_portal_enabled: false })
        .eq("hostname", TENANT_HOSTNAME);
      return json({ success: true, cleaned: true, user_id: id });
    }

    let password: string | null = null;
    let created = false;
    if (!tenantUser) {
      password = strongPassword();
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email: TENANT_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { name: TENANT_NAME, demo_tenant: "casa-nova-tur" },
      });
      if (error || !newUser?.user) {
        console.error("casanova-provision createUser", error?.message);
        return json({ error: "Falha ao criar a conta do tenant" }, 400);
      }
      tenantUser = newUser.user;
      created = true;
    } else if (action === "reset_password") {
      password = strongPassword();
      const { error } = await admin.auth.admin.updateUserById(tenantUser.id, {
        password,
        email_confirm: true,
      });
      if (error) {
        console.error("casanova-provision reset_password", error.message);
        return json({ error: "Falha ao redefinir a senha temporária" }, 400);
      }
    }
    const tenantId = tenantUser.id;

    // Profile: identidade pública oficial (dados fornecidos pela agência).
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: tenantId,
        name: TENANT_NAME,
        agency_name: TENANT_NAME,
        public_slug: TENANT_SLUG,
        phone: "+55 51 98184-2827",
        street: "Rua Sarandi",
        address_number: "330",
        zip_code: "93548-120",
        city: "Novo Hamburgo",
        state: "RS",
        cnpj: "48.227.523/0001-00",
        bio:
          "Viagens nacionais e internacionais, cruzeiros, parques e roteiros personalizados, com atendimento próximo e acompanhamento antes, durante e depois da viagem.",
        agency_primary_color: PALETTE.primary,
        agency_secondary_color: PALETTE.secondary,
        agency_secondary_auto: false,
        agency_tertiary_color: PALETTE.tertiary,
        agency_tertiary_auto: false,
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      console.error("casanova-provision profile", profileError.message);
      return json({ error: "Falha ao gravar o perfil do tenant" }, 400);
    }

    // Agência: a conta é master de si mesma (menor privilégio possível).
    await admin
      .from("agency_membership")
      .upsert({ user_id: tenantId, agency_id: tenantId, role: "master" }, { onConflict: "user_id" });

    // Domínio TÉCNICO de prévia (o domínio real não é vinculado).
    const { error: domainError } = await admin.from("agency_public_domains").upsert(
      {
        hostname: TENANT_HOSTNAME,
        user_id: tenantId,
        agency_slug: TENANT_SLUG,
        is_active: true,
        is_primary: true,
        admin_portal_enabled: true,
      },
      { onConflict: "hostname" },
    );
    if (domainError) {
      console.error("casanova-provision domain", domainError.message);
      return json({ error: "Falha ao vincular o host técnico" }, 400);
    }

    // Plano compatível com o painel completo.
    await admin
      .from("subscriptions")
      .upsert({ user_id: tenantId, plan: "premium", is_active: true }, { onConflict: "user_id" });

    // Pipeline padrão de operações (idempotente na própria função do banco).
    const { error: stagesError } = await admin.rpc("ensure_default_operation_stages", {
      _user_id: tenantId,
    });
    if (stagesError) console.error("casanova-provision stages", stagesError.message);

    /* ------------------ Dados FICTÍCIOS, isolados neste tenant ------------------ */
    const demoClients = [
      { name: "Ana e Roberto Martins", city: "Novo Hamburgo", status: "em_negociacao" },
      { name: "Juliana Ferreira", city: "Porto Alegre", status: "lead" },
      { name: "Carlos Almeida", city: "São Leopoldo", status: "cliente_ativo" },
      { name: "Mariana Souza", city: "Canoas", status: "em_negociacao" },
    ];
    const clientIds: Record<string, string> = {};
    for (const c of demoClients) {
      const { data: existing } = await admin
        .from("clients")
        .select("id")
        .eq("user_id", tenantId)
        .eq("name", c.name)
        .maybeSingle();
      if (existing?.id) {
        clientIds[c.name] = existing.id;
        continue;
      }
      const { data: inserted, error } = await admin
        .from("clients")
        .insert({
          user_id: tenantId,
          name: c.name,
          city: c.city,
          status: c.status,
          internal_notes: "Registro de demonstração do ambiente de prévia.",
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("casanova-provision client", error?.message);
        return json({ error: "Falha ao criar os clientes de demonstração" }, 400);
      }
      clientIds[c.name] = inserted.id;
    }

    const demoOpportunities = [
      {
        client: "Ana e Roberto Martins",
        destination: "Orlando em família",
        stage: "new_contact",
        adults: 2,
        children: 2,
        value: 38000,
        start: futureDate(150),
        end: futureDate(162),
      },
      {
        client: "Juliana Ferreira",
        destination: "Lua de mel — Itália e França",
        stage: "quote_creating",
        adults: 2,
        children: 0,
        value: 52000,
        start: futureDate(210),
        end: futureDate(226),
      },
      {
        client: "Carlos Almeida",
        destination: "Cruzeiro pelo Caribe",
        stage: "quote_sent",
        adults: 2,
        children: 1,
        value: 29000,
        start: futureDate(120),
        end: futureDate(128),
      },
    ];
    for (const o of demoOpportunities) {
      const clientId = clientIds[o.client];
      const { data: existing } = await admin
        .from("opportunities")
        .select("id")
        .eq("user_id", tenantId)
        .eq("destination", o.destination)
        .maybeSingle();
      if (existing?.id) continue;
      const { error } = await admin.from("opportunities").insert({
        user_id: tenantId,
        client_id: clientId,
        destination: o.destination,
        stage: o.stage,
        adults_count: o.adults,
        children_count: o.children,
        passengers_count: o.adults + o.children,
        estimated_value: o.value,
        start_date: o.start,
        end_date: o.end,
        notes: "Oportunidade de demonstração do ambiente de prévia.",
      });
      if (error) {
        console.error("casanova-provision opportunity", error.message);
        return json({ error: "Falha ao criar as oportunidades de demonstração" }, 400);
      }
    }

    const demoOperations = [
      {
        client: "Mariana Souza",
        title: "Resort em Porto de Galinhas",
        destination: "Porto de Galinhas, PE",
        stage: "venda_confirmada",
        passengers: 4,
        amount: 21500,
        start: futureDate(95),
        end: futureDate(102),
      },
      {
        client: "Carlos Almeida",
        title: "Orlando — Disney e Universal",
        destination: "Orlando, EUA",
        stage: "emissao",
        passengers: 3,
        amount: 41800,
        start: futureDate(140),
        end: futureDate(152),
      },
    ];
    for (const op of demoOperations) {
      const { data: existing } = await admin
        .from("operations")
        .select("id")
        .eq("user_id", tenantId)
        .eq("title", op.title)
        .maybeSingle();
      if (existing?.id) continue;
      const { error } = await admin.from("operations").insert({
        user_id: tenantId,
        client_id: clientIds[op.client],
        title: op.title,
        destination: op.destination,
        stage: op.stage,
        passengers_count: op.passengers,
        sale_amount: op.amount,
        travel_start_date: op.start,
        travel_end_date: op.end,
        notes: "Operação de demonstração do ambiente de prévia.",
      });
      if (error) {
        console.error("casanova-provision operation", error.message);
        return json({ error: "Falha ao criar as operações de demonstração" }, 400);
      }
    }

    return json({
      success: true,
      created,
      user_id: tenantId,
      email: TENANT_EMAIL,
      hostname: TENANT_HOSTNAME,
      /** Presente apenas quando a senha foi gerada nesta chamada. */
      temporary_password: password,
    });
  } catch (err) {
    console.error("casanova-provision error", err);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});
