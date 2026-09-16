import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  cleanupPlan,
  newMappings,
  SCENARIO_SLUG,
  tenantColumn,
  type ScenarioRecord,
} from "./scenario.ts";
import {
  offsetDate,
  paymentSummary,
  publicSafeTraveler,
  SCENARIO_CLIENT,
  SCENARIO_ITINERARY,
  SCENARIO_SERVICES,
  SCENARIO_TRAVELERS,
  saleProductType,
  servicesTotal,
  TRIP_ADULTS,
  TRIP_CHILDREN,
  TRIP_DAYS,
  TRIP_DESTINATION,
  TRIP_NIGHTS,
  TRIP_START_OFFSET,
  TRIP_TITLE,
  TRIP_TOTAL,
} from "./scenario-data.ts";

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

const TENANT_EMAIL = "contato@casanovatur.com.br";
/**
 * Grafia incorreta usada na primeira prévia. Quando encontrada, a conta é
 * MIGRADA para o e-mail oficial preservando user_id e todos os vínculos
 * (profile, membership, domínio técnico, plano e dados fictícios).
 */
const LEGACY_TENANT_EMAILS = ["contato@casanovatour.com.br"];
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
    const users = list?.users ?? [];
    let tenantUser = users.find((u) => u.email?.toLowerCase() === TENANT_EMAIL);
    let emailMigrated = false;
    if (!tenantUser) {
      const legacy = users.find((u) =>
        LEGACY_TENANT_EMAILS.includes((u.email || "").toLowerCase()),
      );
      if (legacy) {
        tenantUser = legacy;
        if (action !== "cleanup") {
          const { data: updated, error } = await admin.auth.admin.updateUserById(legacy.id, {
            email: TENANT_EMAIL,
            email_confirm: true,
          });
          if (error) {
            console.error("casanova-provision email migration", error.message);
            return json({ error: "Falha ao corrigir o e-mail do tenant" }, 400);
          }
          tenantUser = updated?.user ?? legacy;
          emailMigrated = true;
        }
      }
    }

    if (action === "cleanup") {
      if (!tenantUser) return json({ success: true, cleaned: false });
      const id = tenantUser.id;

      /**
       * Cleanup MAPEADO: remove apenas os registros criados pelo provisionamento
       * e mapeados em `demo_scenario_records`. Qualquer dado manual do tenant
       * (ex.: o cliente "Fernando") é preservado por construção.
       */
      const { data: scenario } = await admin
        .from("demo_scenarios")
        .select("id")
        .eq("slug", SCENARIO_SLUG)
        .eq("user_id", id)
        .maybeSingle();

      let removed = 0;
      if (scenario?.id) {
        const { data: records } = await admin
          .from("demo_scenario_records")
          .select("table_name, record_id")
          .eq("scenario_id", scenario.id);
        for (const step of cleanupPlan((records ?? []) as ScenarioRecord[])) {
          const col = tenantColumn(step.table);
          let query = admin.from(step.table).delete().in("id", step.ids);
          // Defesa em profundidade: quando a tabela tem coluna de tenant, o
          // delete também é filtrado por ela.
          if (col) query = query.eq(col, id);
          const { error } = await query;
          if (error) {
            console.error("casanova-provision cleanup", step.table, error.message);
            return json({ error: "Falha ao remover os dados do cenário" }, 400);
          }
          removed += step.ids.length;
        }
        await admin.from("demo_scenario_records").delete().eq("scenario_id", scenario.id);
      }

      await admin
        .from("agency_public_domains")
        .update({ is_active: false, admin_portal_enabled: false })
        .eq("hostname", TENANT_HOSTNAME);
      return json({ success: true, cleaned: true, user_id: id, removed });
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

    /**
     * Cenário demonstrativo: marcação explícita e auditável do tenant. Somente
     * tenants presentes aqui podem receber automações de demonstração.
     */
    const { data: scenarioRow, error: scenarioError } = await admin
      .from("demo_scenarios")
      .upsert(
        {
          slug: SCENARIO_SLUG,
          user_id: tenantId,
          label: `${TENANT_NAME} — cenário demonstrativo`,
          hostname: TENANT_HOSTNAME,
          is_demo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (scenarioError || !scenarioRow) {
      console.error("casanova-provision scenario", scenarioError?.message);
      return json({ error: "Falha ao registrar o cenário demonstrativo" }, 400);
    }
    const scenarioId = scenarioRow.id;
    /** Registros que pertencem ao cenário (base do cleanup mapeado). */
    const mapped: ScenarioRecord[] = [];

    /* ------------------ Dados FICTÍCIOS, isolados neste tenant ------------------ */
    // Normalização das versões anteriores do cenário: renomeia em vez de criar
    // um segundo cliente (idempotência entre execuções).
    for (const legacy of SCENARIO_CLIENT.legacyNames) {
      await admin
        .from("clients")
        .update({ name: SCENARIO_CLIENT.name })
        .eq("user_id", tenantId)
        .eq("name", legacy);
    }

    const demoClients = [
      { name: SCENARIO_CLIENT.name, city: SCENARIO_CLIENT.city, status: SCENARIO_CLIENT.status },
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
        mapped.push({ table_name: "clients", record_id: existing.id, record_role: c.name });
        continue;
      }
      const { data: inserted, error } = await admin
        .from("clients")
        .insert({
          user_id: tenantId,
          name: c.name,
          city: c.city,
          status: c.status,
          internal_notes: "Cenário demonstrativo — dados fictícios.",
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("casanova-provision client", error?.message);
        return json({ error: "Falha ao criar os clientes de demonstração" }, 400);
      }
      clientIds[c.name] = inserted.id;
      mapped.push({ table_name: "clients", record_id: inserted.id, record_role: c.name });
    }

    /** Datas da viagem principal do cenário (8 dias / 7 noites). */
    const tripStart = futureDate(TRIP_START_OFFSET);
    const tripEnd = futureDate(TRIP_START_OFFSET + TRIP_NIGHTS);
    const tripStartDate = new Date(`${tripStart}T00:00:00Z`);

    // Normaliza a oportunidade das versões anteriores do cenário.
    await admin
      .from("opportunities")
      .update({ destination: TRIP_TITLE })
      .eq("user_id", tenantId)
      .eq("destination", "Orlando em família");

    const demoOpportunities = [
      {
        client: SCENARIO_CLIENT.name,
        destination: TRIP_TITLE,
        stage: "closed",
        adults: TRIP_ADULTS,
        children: TRIP_CHILDREN,
        value: TRIP_TOTAL,
        start: tripStart,
        end: tripEnd,
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
    const opportunityIds: Record<string, string> = {};
    for (const o of demoOpportunities) {
      const clientId = clientIds[o.client];
      const { data: existing } = await admin
        .from("opportunities")
        .select("id")
        .eq("user_id", tenantId)
        .eq("destination", o.destination)
        .maybeSingle();
      const payload = {
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
        notes: "Cenário demonstrativo — dados fictícios.",
      };
      if (existing?.id) {
        // Normaliza (sem duplicar) a oportunidade já existente do cenário.
        await admin.from("opportunities").update(payload).eq("id", existing.id);
        opportunityIds[o.destination] = existing.id;
        mapped.push({
          table_name: "opportunities",
          record_id: existing.id,
          record_role: o.destination,
        });
        continue;
      }
      const { data: insertedOpp, error } = await admin
        .from("opportunities")
        .insert(payload)
        .select("id")
        .single();
      if (error || !insertedOpp) {
        console.error("casanova-provision opportunity", error?.message);
        return json({ error: "Falha ao criar as oportunidades de demonstração" }, 400);
      }
      opportunityIds[o.destination] = insertedOpp.id;
      mapped.push({
        table_name: "opportunities",
        record_id: insertedOpp.id,
        record_role: o.destination,
      });
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
        client: SCENARIO_CLIENT.name,
        title: TRIP_TITLE,
        destination: TRIP_DESTINATION,
        stage: "emissao",
        passengers: TRIP_ADULTS + TRIP_CHILDREN,
        amount: TRIP_TOTAL,
        start: tripStart,
        end: tripEnd,
      },
    ];
    const operationIds: Record<string, string> = {};
    for (const op of demoOperations) {
      const { data: existing } = await admin
        .from("operations")
        .select("id")
        .eq("user_id", tenantId)
        .eq("title", op.title)
        .maybeSingle();
      const payload = {
        user_id: tenantId,
        client_id: clientIds[op.client],
        title: op.title,
        destination: op.destination,
        stage: op.stage,
        passengers_count: op.passengers,
        sale_amount: op.amount,
        travel_start_date: op.start,
        travel_end_date: op.end,
        notes: "Cenário demonstrativo — dados fictícios.",
      };
      if (existing?.id) {
        await admin.from("operations").update(payload).eq("id", existing.id);
        operationIds[op.title] = existing.id;
        mapped.push({ table_name: "operations", record_id: existing.id, record_role: op.title });
        continue;
      }
      const { data: insertedOp, error } = await admin
        .from("operations")
        .insert(payload)
        .select("id")
        .single();
      if (error || !insertedOp) {
        console.error("casanova-provision operation", error?.message);
        return json({ error: "Falha ao criar as operações de demonstração" }, 400);
      }
      operationIds[op.title] = insertedOp.id;
      mapped.push({ table_name: "operations", record_id: insertedOp.id, record_role: op.title });
    }

    /* ================= Etapa 2 — cenário ponta a ponta (Ana Martins) =================
     * Encadeia cliente → viajantes → oportunidade → orçamento → operação →
     * ficha da Central → roteiro → carteira digital → venda/financeiro, sempre
     * preservando os IDs de origem e sem criar um segundo conjunto de registros.
     */
    const anaId = clientIds[SCENARIO_CLIENT.name];
    const scenarioOpportunityId = opportunityIds[TRIP_TITLE];
    const scenarioOperationId = operationIds[TRIP_TITLE];
    const payment = paymentSummary();
    const e2e: Record<string, string> = {};

    if (anaId && scenarioOpportunityId && scenarioOperationId) {
      /** Perfil do cliente principal, amplamente preenchido. */
      await admin
        .from("clients")
        .update({
          email: SCENARIO_CLIENT.email,
          phone: SCENARIO_CLIENT.phone,
          city: SCENARIO_CLIENT.city,
          status: SCENARIO_CLIENT.status,
          notes: SCENARIO_CLIENT.notes,
          internal_notes: SCENARIO_CLIENT.internal_notes,
          travel_preferences: SCENARIO_CLIENT.travel_preferences,
          birthday_day: SCENARIO_CLIENT.birthday_day,
          birthday_month: SCENARIO_CLIENT.birthday_month,
          birthday_year: SCENARIO_CLIENT.birthday_year,
        })
        .eq("id", anaId);

      /** Viajantes: Ana (responsável) e Roberto (acompanhante). */
      for (const t of SCENARIO_TRAVELERS) {
        const { data: found } = await admin
          .from("travelers")
          .select("id")
          .eq("user_id", tenantId)
          .eq("client_id", anaId)
          .eq("nome_completo", t.nome_completo)
          .maybeSingle();
        const row = {
          user_id: tenantId,
          client_id: anaId,
          nome_completo: t.nome_completo,
          data_nascimento: t.data_nascimento,
          cpf: t.cpf,
          passaporte: t.passaporte,
          validade_passaporte: t.validade_passaporte,
          nacionalidade: t.nacionalidade,
          observacoes: t.observacoes,
          is_responsavel: t.is_responsavel,
        };
        const id = found?.id
          ? ((await admin.from("travelers").update(row).eq("id", found.id)), found.id)
          : (await admin.from("travelers").insert(row).select("id").single()).data?.id;
        if (id) mapped.push({ table_name: "travelers", record_id: id, record_role: t.key });
      }

      /** Orçamento aprovado, vinculado à oportunidade. */
      const { data: foundQuote } = await admin
        .from("quotes")
        .select("id")
        .eq("user_id", tenantId)
        .eq("opportunity_id", scenarioOpportunityId)
        .maybeSingle();
      const quotePayload = {
        user_id: tenantId,
        client_id: anaId,
        client_name: SCENARIO_CLIENT.name,
        opportunity_id: scenarioOpportunityId,
        trip_title: TRIP_TITLE,
        destination: TRIP_DESTINATION,
        start_date: tripStart,
        end_date: tripEnd,
        adults_count: TRIP_ADULTS,
        children_count: TRIP_CHILDREN,
        total_amount: TRIP_TOTAL,
        status: "approved",
        currency: "BRL",
        payment_terms: "Entrada de 30% na confirmação e saldo em até 30 dias antes do embarque.",
      };
      const quoteId = foundQuote?.id
        ? ((await admin.from("quotes").update(quotePayload).eq("id", foundQuote.id)),
          foundQuote.id)
        : (await admin.from("quotes").insert(quotePayload).select("id").single()).data?.id;
      if (quoteId) {
        e2e.quote_id = quoteId;
        mapped.push({ table_name: "quotes", record_id: quoteId, record_role: "orcamento-orlando" });
      }

      /** Os oito serviços aprovados — chave natural por serviço. */
      const quoteServiceIds: Record<string, string> = {};
      if (quoteId) {
        for (const [i, s] of SCENARIO_SERVICES.entries()) {
          const service_data = {
            demo_key: s.key,
            name: s.name,
            supplier: s.supplier,
            start_date: offsetDate(tripStartDate, s.dayFrom),
            end_date: offsetDate(tripStartDate, s.dayTo),
            ...s.details,
          };
          const { data: existingSvc } = await admin
            .from("quote_services")
            .select("id, service_data")
            .eq("quote_id", quoteId)
            .eq("service_type", s.kind)
            .order("order_index", { ascending: true });
          const match = (existingSvc ?? []).find(
            (r: { service_data: Record<string, unknown> | null }) =>
              (r.service_data as { demo_key?: string } | null)?.demo_key === s.key,
          ) as { id: string } | undefined;
          const row = {
            quote_id: quoteId,
            service_type: s.kind,
            amount: s.amount,
            order_index: i,
            description: s.name,
            service_data,
          };
          const id = match?.id
            ? ((await admin.from("quote_services").update(row).eq("id", match.id)), match.id)
            : (await admin.from("quote_services").insert(row).select("id").single()).data?.id;
          if (id) {
            quoteServiceIds[s.key] = id;
            mapped.push({ table_name: "quote_services", record_id: id, record_role: s.key });
          }
        }
      }

      /** Operação em Emissão/Reservas com os serviços rastreáveis ao orçamento. */
      await admin
        .from("operations")
        .update({
          opportunity_id: scenarioOpportunityId,
          quote_id: quoteId ?? null,
          payment_status: payment.status,
        })
        .eq("id", scenarioOperationId);

      for (const [i, s] of SCENARIO_SERVICES.entries()) {
        const sourceId = quoteServiceIds[s.key] ?? null;
        const { data: existingOpSvc } = await admin
          .from("operation_services")
          .select("id")
          .eq("operation_id", scenarioOperationId)
          .eq("name", s.name)
          .maybeSingle();
        const row = {
          operation_id: scenarioOperationId,
          user_id: tenantId,
          source_quote_service_id: sourceId,
          service_type: s.kind,
          name: s.name,
          supplier: s.supplier,
          destination: TRIP_DESTINATION,
          start_date: offsetDate(tripStartDate, s.dayFrom),
          end_date: offsetDate(tripStartDate, s.dayTo),
          amount: s.amount,
          position: i,
          is_confirmed: true,
          service_data: { demo_key: s.key, ...s.details },
        };
        const id = existingOpSvc?.id
          ? ((await admin.from("operation_services").update(row).eq("id", existingOpSvc.id)),
            existingOpSvc.id)
          : (await admin.from("operation_services").insert(row).select("id").single()).data?.id;
        if (id) mapped.push({ table_name: "operation_services", record_id: id, record_role: s.key });
      }

      /** Histórico da oportunidade até o fechamento. */
      const { data: history } = await admin
        .from("opportunity_history")
        .select("id, to_stage")
        .eq("opportunity_id", scenarioOpportunityId);
      for (const step of [
        { to: "quote_creating", note: "Briefing coletado com Ana e Roberto." },
        { to: "quote_sent", note: "Orçamento de Orlando enviado ao cliente." },
        { to: "closed", note: "Cliente aprovou o orçamento e pagou a entrada." },
      ]) {
        const found = (history ?? []).find((h: { to_stage: string }) => h.to_stage === step.to) as
          | { id: string }
          | undefined;
        const id = found?.id
          ? found.id
          : (
              await admin
                .from("opportunity_history")
                .insert({
                  opportunity_id: scenarioOpportunityId,
                  to_stage: step.to,
                  notes: step.note,
                })
                .select("id")
                .single()
            ).data?.id;
        if (id)
          mapped.push({ table_name: "opportunity_history", record_id: id, record_role: step.to });
      }

      /** Roteiro de 8 dias. */
      const { data: foundItinerary } = await admin
        .from("itineraries")
        .select("id")
        .eq("user_id", tenantId)
        .eq("client_id", anaId)
        .eq("destination", TRIP_DESTINATION)
        .maybeSingle();
      const itineraryPayload = {
        user_id: tenantId,
        client_id: anaId,
        destination: TRIP_DESTINATION,
        start_date: tripStart,
        end_date: tripEnd,
        travelers_count: TRIP_ADULTS,
        trip_type: "casal",
        budget_level: "conforto",
        status: "approved",
        headline: TRIP_TITLE,
      };
      const itineraryId = foundItinerary?.id
        ? ((await admin.from("itineraries").update(itineraryPayload).eq("id", foundItinerary.id)),
          foundItinerary.id)
        : (await admin.from("itineraries").insert(itineraryPayload).select("id").single()).data?.id;
      if (itineraryId) {
        e2e.itinerary_id = itineraryId;
        mapped.push({
          table_name: "itineraries",
          record_id: itineraryId,
          record_role: "roteiro-orlando",
        });
        for (const day of SCENARIO_ITINERARY) {
          const date = offsetDate(tripStartDate, day.day - 1);
          const { data: foundDay } = await admin
            .from("itinerary_days")
            .select("id")
            .eq("itinerary_id", itineraryId)
            .eq("day_number", day.day)
            .maybeSingle();
          const dayId = foundDay?.id
            ? ((await admin.from("itinerary_days").update({ date }).eq("id", foundDay.id)),
              foundDay.id)
            : (
                await admin
                  .from("itinerary_days")
                  .insert({ itinerary_id: itineraryId, day_number: day.day, date })
                  .select("id")
                  .single()
              ).data?.id;
          if (!dayId) continue;
          mapped.push({
            table_name: "itinerary_days",
            record_id: dayId,
            record_role: `dia-${day.day}`,
          });
          for (const [ai, act] of day.activities.entries()) {
            const { data: foundAct } = await admin
              .from("itinerary_activities")
              .select("id")
              .eq("day_id", dayId)
              .eq("period", act.period)
              .maybeSingle();
            const actRow = {
              day_id: dayId,
              period: act.period,
              title: act.title,
              description: act.description,
              order_index: ai,
              is_approved: true,
            };
            const actId = foundAct?.id
              ? ((await admin.from("itinerary_activities").update(actRow).eq("id", foundAct.id)),
                foundAct.id)
              : (
                  await admin.from("itinerary_activities").insert(actRow).select("id").single()
                ).data?.id;
            if (actId)
              mapped.push({
                table_name: "itinerary_activities",
                record_id: actId,
                record_role: `dia-${day.day}-${act.period}`,
              });
          }
        }
      }

      /** Carteira digital (viagem) com os serviços do cenário. */
      const { data: foundTrip } = await admin
        .from("trips")
        .select("id")
        .eq("user_id", tenantId)
        .eq("client_id", anaId)
        .eq("trip_title", TRIP_TITLE)
        .maybeSingle();
      const tripPayload = {
        user_id: tenantId,
        client_id: anaId,
        client_name: SCENARIO_CLIENT.name,
        trip_title: TRIP_TITLE,
        destination: TRIP_DESTINATION,
        start_date: tripStart,
        end_date: tripEnd,
        status: "confirmed",
        opportunity_id: scenarioOpportunityId,
        itinerary_id: itineraryId ?? null,
        itinerary_mode: itineraryId ? "legacy" : "none",
      };
      const tripId = foundTrip?.id
        ? ((await admin.from("trips").update(tripPayload).eq("id", foundTrip.id)), foundTrip.id)
        : (await admin.from("trips").insert(tripPayload).select("id").single()).data?.id;
      if (tripId) {
        e2e.trip_id = tripId;
        mapped.push({ table_name: "trips", record_id: tripId, record_role: "carteira-orlando" });
        await admin.from("operations").update({ trip_id: tripId }).eq("id", scenarioOperationId);
        for (const [i, s] of SCENARIO_SERVICES.entries()) {
          const service_data = {
            demo_key: s.key,
            name: s.name,
            supplier: s.supplier,
            amount: s.amount,
            start_date: offsetDate(tripStartDate, s.dayFrom),
            end_date: offsetDate(tripStartDate, s.dayTo),
            /** A Área do Cliente exibe apenas nomes — sem CPF ou passaporte. */
            passengers: SCENARIO_TRAVELERS.map(publicSafeTraveler),
            ...s.details,
          };
          const { data: existingTs } = await admin
            .from("trip_services")
            .select("id, service_data")
            .eq("trip_id", tripId);
          const match = (existingTs ?? []).find(
            (r: { service_data: Record<string, unknown> | null }) =>
              (r.service_data as { demo_key?: string } | null)?.demo_key === s.key,
          ) as { id: string } | undefined;
          const row = { trip_id: tripId, service_type: s.kind, order_index: i, service_data };
          const id = match?.id
            ? ((await admin.from("trip_services").update(row).eq("id", match.id)), match.id)
            : (await admin.from("trip_services").insert(row).select("id").single()).data?.id;
          if (id) mapped.push({ table_name: "trip_services", record_id: id, record_role: s.key });
        }
      }

      /** Acesso da Área do Cliente à carteira (grant, sem envio de e-mail). */
      const { data: account } = await admin
        .from("client_area_accounts")
        .select("id")
        .eq("agency_id", tenantId)
        .maybeSingle();
      if (account?.id && tripId) {
        await admin
          .from("client_area_accounts")
          .update({ client_id: anaId })
          .eq("id", account.id);
        const { data: foundGrant } = await admin
          .from("client_area_wallet_grants")
          .select("id")
          .eq("agency_id", tenantId)
          .eq("trip_id", tripId)
          .maybeSingle();
        if (!foundGrant?.id) {
          const { data: grant } = await admin
            .from("client_area_wallet_grants")
            .insert({
              agency_id: tenantId,
              account_id: account.id,
              client_id: anaId,
              operation_id: scenarioOperationId,
              trip_id: tripId,
              /** Token apenas de demonstração; nada é enviado externamente. */
              token_hash: `demo-${tripId}`,
              expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
            })
            .select("id")
            .single();
          if (grant?.id)
            mapped.push({
              table_name: "client_area_wallet_grants",
              record_id: grant.id,
              record_role: "carteira-orlando",
            });
        } else {
          mapped.push({
            table_name: "client_area_wallet_grants",
            record_id: foundGrant.id,
            record_role: "carteira-orlando",
          });
        }
      }

      /** Ficha da Central de Reservas (travel_files) e seus serviços. */
      const { data: foundFile } = await admin
        .from("travel_files")
        .select("id")
        .eq("agency_id", tenantId)
        .eq("manual_key", "demo-orlando-ana")
        .maybeSingle();
      const filePayload = {
        agency_id: tenantId,
        manual_key: "demo-orlando-ana",
        origin: "manual",
        contractor_type: "individual",
        client_id: anaId,
        contact_client_id: anaId,
        opportunity_id: scenarioOpportunityId,
        quote_id: quoteId ?? null,
        operation_id: scenarioOperationId,
        trip_name: TRIP_TITLE,
        primary_destination: TRIP_DESTINATION,
        start_date: tripStart,
        end_date: tripEnd,
        adults_count: TRIP_ADULTS,
        children_count: TRIP_CHILDREN,
        passengers_count: TRIP_ADULTS + TRIP_CHILDREN,
        currency: "BRL",
        requested_amount: TRIP_TOTAL,
        final_sale_amount: TRIP_TOTAL,
        status: "in_operation",
        operational_status: "in_progress",
        financial_status: payment.status === "parcial" ? "partial" : "pending",
        responsible_user_id: tenantId,
        created_by_user_id: tenantId,
      };
      /** Número sequencial da ficha, seguindo a numeração já usada na agência. */
      const { data: lastFile } = await admin
        .from("travel_files")
        .select("file_number")
        .eq("agency_id", tenantId)
        .order("file_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextFileNumber = ((lastFile?.file_number as number | null) ?? 0) + 1;
      const fileId = foundFile?.id
        ? ((await admin.from("travel_files").update(filePayload).eq("id", foundFile.id)),
          foundFile.id)
        : (
            await admin
              .from("travel_files")
              .insert({ ...filePayload, file_number: nextFileNumber })
              .select("id")
              .single()
          ).data?.id;
      if (fileId) {
        e2e.travel_file_id = fileId;
        mapped.push({ table_name: "travel_files", record_id: fileId, record_role: "ficha-orlando" });
        for (const s of SCENARIO_SERVICES) {
          const { data: existingFs } = await admin
            .from("travel_file_services")
            .select("id")
            .eq("file_id", fileId)
            .eq("product_name", s.name)
            .maybeSingle();
          const row = {
            file_id: fileId,
            agency_id: tenantId,
            source_quote_service_id: quoteServiceIds[s.key] ?? null,
            service_type: s.kind,
            product_name: s.name,
            supplier_name: s.supplier,
            destination: TRIP_DESTINATION,
            start_date: offsetDate(tripStartDate, s.dayFrom),
            end_date: offsetDate(tripStartDate, s.dayTo),
            passengers_count: TRIP_ADULTS,
            currency: "BRL",
            requested_amount: s.amount,
            reconfirmed_amount: s.amount,
            sold_amount: s.amount,
            status: "booked",
            snapshot: { demo_key: s.key, ...s.details },
          };
          const id = existingFs?.id
            ? ((await admin.from("travel_file_services").update(row).eq("id", existingFs.id)),
              existingFs.id)
            : (await admin.from("travel_file_services").insert(row).select("id").single()).data?.id;
          if (id)
            mapped.push({
              table_name: "travel_file_services",
              record_id: id,
              record_role: s.key,
            });
        }
      }

      /** Venda, produtos e financeiro parcial (nenhuma cobrança real). */
      const { data: foundSale } = await admin
        .from("sales")
        .select("id")
        .eq("user_id", tenantId)
        .eq("opportunity_id", scenarioOpportunityId)
        .maybeSingle();
      const salePayload = {
        user_id: tenantId,
        client_id: anaId,
        client_name: SCENARIO_CLIENT.name,
        opportunity_id: scenarioOpportunityId,
        destination: TRIP_DESTINATION,
        sale_amount: TRIP_TOTAL,
        sale_date: new Date().toISOString().slice(0, 10),
        start_date: tripStart,
        end_date: tripEnd,
        trip_type: "casal",
        trip_status: "confirmada",
        origin: "importacao",
        source_quote_id: quoteId ?? null,
        source_trip_id: tripId ?? null,
        source_operation_id: scenarioOperationId,
        import_provenance: { scenario: SCENARIO_SLUG, from: "orcamento-aprovado" },
        notes: "Venda de demonstração — sem cobrança real.",
      };
      const saleId = foundSale?.id
        ? ((await admin.from("sales").update(salePayload).eq("id", foundSale.id)), foundSale.id)
        : (await admin.from("sales").insert(salePayload).select("id").single()).data?.id;
      if (saleId) {
        e2e.sale_id = saleId;
        mapped.push({ table_name: "sales", record_id: saleId, record_role: "venda-orlando" });
        for (const s of SCENARIO_SERVICES) {
          const { data: existingProd } = await admin
            .from("sale_products")
            .select("id")
            .eq("sale_id", saleId)
            .eq("description", s.name)
            .maybeSingle();
          const row = {
            sale_id: saleId,
            user_id: tenantId,
            product_type: s.kind,
            description: s.name,
            supplier_name: s.supplier,
            sale_price: s.amount,
            commission_type: "percentage",
            commission_value: 10,
            source_kind: "quote_service",
            source_service_id: quoteServiceIds[s.key] ?? null,
            source_provenance: { scenario: SCENARIO_SLUG, demo_key: s.key },
          };
          const id = existingProd?.id
            ? ((await admin.from("sale_products").update(row).eq("id", existingProd.id)),
              existingProd.id)
            : (await admin.from("sale_products").insert(row).select("id").single()).data?.id;
          if (id)
            mapped.push({ table_name: "sale_products", record_id: id, record_role: s.key });
        }

        /** Recebimento parcial: entrada de 30%. */
        const { data: foundIncome } = await admin
          .from("income_entries")
          .select("id")
          .eq("user_id", tenantId)
          .eq("sale_id", saleId)
          .maybeSingle();
        if (!foundIncome?.id && payment.paid > 0) {
          const { data: income } = await admin
            .from("income_entries")
            .insert({
              user_id: tenantId,
              sale_id: saleId,
              amount: payment.paid,
              received_amount: payment.paid,
              entry_date: new Date().toISOString().slice(0, 10),
              received_date: new Date().toISOString().slice(0, 10),
              payment_method: "pix",
              status: "recebido",
              source: "manual",
              notes: "Entrada de demonstração (30%) — sem cobrança real.",
            })
            .select("id")
            .single();
          if (income?.id)
            mapped.push({
              table_name: "income_entries",
              record_id: income.id,
              record_role: "entrada-30",
            });
        } else if (foundIncome?.id) {
          mapped.push({
            table_name: "income_entries",
            record_id: foundIncome.id,
            record_role: "entrada-30",
          });
        }
      }
    }

    /**
     * Mapeamento idempotente: só grava vínculos que ainda não existem, de modo
     * que reexecutar o provisionamento não duplica registros nem mapeamentos.
     */
    const { data: existingMappings } = await admin
      .from("demo_scenario_records")
      .select("table_name, record_id")
      .eq("scenario_id", scenarioId);
    const pending = newMappings((existingMappings ?? []) as ScenarioRecord[], mapped);
    if (pending.length > 0) {
      const { error: mapError } = await admin
        .from("demo_scenario_records")
        .insert(pending.map((r) => ({ ...r, scenario_id: scenarioId })));
      if (mapError) {
        console.error("casanova-provision mapping", mapError.message);
        return json({ error: "Falha ao mapear os registros do cenário" }, 400);
      }
    }

    return json({
      success: true,
      created,
      email_migrated: emailMigrated,
      user_id: tenantId,
      email: TENANT_EMAIL,
      hostname: TENANT_HOSTNAME,
      scenario_id: scenarioId,
      scenario_records: mapped.length,
      scenario_records_added: pending.length,
      /** Presente apenas quando a senha foi gerada nesta chamada. */
      temporary_password: password,
    });
  } catch (err) {
    console.error("casanova-provision error", err);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});
