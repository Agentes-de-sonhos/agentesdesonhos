/**
 * Carga demonstrativa CANÔNICA do SiteLab Base — materialização e cópia.
 *
 * O SiteLab Base é o consumidor mestre do mesmo sistema compartilhado. Esta
 * função:
 *  - `seed_canonical`  → materializa (uma vez, idempotente) a carga canônica no
 *    tenant TÉCNICO do SiteLab, a partir do cenário de referência já construído.
 *    Depois disso, a fonte de verdade é o próprio banco do SiteLab: Fernando
 *    edita pelas telas reais da Gestão e nada aqui reescreve textos ou valores;
 *  - `clone_to_tenant` → ao provisionar um white label para APRESENTAÇÃO, copia a
 *    versão MAIS RECENTE da carga canônica (snapshot), com IDs novos, vínculos
 *    remapeados e datas recalculadas no momento da cópia. Opcional por definição:
 *    sem `include_demo_load: true` nada é copiado e o tenant nasce vazio;
 *  - `cleanup`         → remove SOMENTE os registros mapeados de um cenário.
 *
 * Não há sincronização viva: agências já criadas nunca recebem alterações
 * retroativas. Identidade (profile, domínio, logo, cores, textos institucionais)
 * nunca é copiada.
 *
 * Acesso restrito a administradores da plataforma ou chamada service role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import {
  CANONICAL_HOSTNAME,
  CANONICAL_SLUG,
  COPY_ORDER,
  copyRole,
  crossTenantRefs,
  demoLoadSlug,
  idMapGet,
  idMapSet,
  REFERENCE_SLUG,
  remapRow,
  type IdMap,
} from "../_shared/demoCanonical.ts";
import { computeDelta, saoPauloToday, targetWindow } from "../_shared/dateShift.ts";

/*
 * Função SERVER-TO-SERVER: não existe chamada de navegador para esta rota
 * (provisionamento e materialização são administrativos). Por isso não há
 * `Access-Control-Allow-Origin: *`; requisições com Origin de navegador são
 * recusadas antes de qualquer trabalho.
 */
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-provision-token",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Senha temporária forte — devolvida apenas nesta resposta, nunca persistida. */
function strongPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

type Admin = ReturnType<typeof createClient>;

/** Tenant resolvido de forma AUTORITATIVA pelo hostname técnico. */
async function tenantByHostname(admin: Admin, hostname: string): Promise<string | null> {
  const { data } = await admin
    .from("agency_public_domains")
    .select("user_id")
    .eq("hostname", hostname)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

async function scenarioBySlug(admin: Admin, slug: string) {
  const { data } = await admin
    .from("demo_scenarios")
    .select("id, user_id, slug, hostname, is_demo")
    .eq("slug", slug)
    .maybeSingle();
  return data as
    | { id: string; user_id: string; slug: string; hostname: string | null; is_demo: boolean }
    | null;
}

async function mappedIds(admin: Admin, scenarioId: string) {
  const { data } = await admin
    .from("demo_scenario_records")
    .select("table_name, record_id, record_role")
    .eq("scenario_id", scenarioId);
  const byTable = new Map<string, string[]>();
  const byRole = new Map<string, { table: string; id: string }>();
  for (const r of data ?? []) {
    const list = byTable.get(r.table_name as string) ?? [];
    list.push(r.record_id as string);
    byTable.set(r.table_name as string, list);
    if (r.record_role) byRole.set(r.record_role as string, {
      table: r.table_name as string,
      id: r.record_id as string,
    });
  }
  return { byTable, byRole };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  // Sem origem de navegador: uso exclusivamente server-to-server.
  const originHeader = (req.headers.get("Origin") || "").trim();
  if (originHeader && originHeader !== "null") return json({ error: "Origem não permitida" }, 403);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization") || "";
    const isServiceCall = authHeader.replace(/^Bearer\s+/i, "").trim() === serviceKey;

    /**
     * Token de provisionamento (Project Settings → Secrets). Existe porque a
     * carga canônica é materializada fora de uma sessão administrativa
     * interativa. Habilita SOMENTE esta função, cujo escopo é fixo: origem e
     * destino são resolvidos por hostname técnico. Sem acesso anon/PUBLIC.
     */
    const provisionToken = (Deno.env.get("DEMO_LOAD_PROVISION_TOKEN") || "").trim();
    const providedToken = (req.headers.get("x-provision-token") || "").trim();
    const isTokenCall =
      provisionToken.length >= 24 &&
      providedToken.length === provisionToken.length &&
      providedToken === provisionToken;

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
    const action = String(body.action || "seed_canonical");

    /* ------------------------------ cleanup mapeado ------------------------------ */
    if (action === "cleanup") {
      const slug = String(body.slug || "");
      const scenario = slug ? await scenarioBySlug(admin, slug) : null;
      if (!scenario || scenario.is_demo !== true) return json({ success: true, cleaned: false });
      const { byTable } = await mappedIds(admin, scenario.id);
      let removed = 0;
      for (const spec of [...COPY_ORDER].reverse()) {
        const ids = byTable.get(spec.table);
        if (!ids?.length) continue;
        let query = admin.from(spec.table).delete().in("id", ids);
        if (spec.tenant) query = query.eq(spec.tenant, scenario.user_id);
        const { error } = await query;
        if (error) return json({ error: `Falha ao remover ${spec.table}` }, 400);
        removed += ids.length;
      }
      await admin.from("demo_scenario_records").delete().eq("scenario_id", scenario.id);
      return json({ success: true, cleaned: true, removed });
    }

    /* --------------------------- origem e destino da cópia --------------------------- */
    let sourceSlug: string;
    let targetUserId: string | null;
    let targetHostname: string | null;
    let targetSlug: string;
    let targetLabel: string;

    if (action === "seed_canonical") {
      sourceSlug = String(body.source_slug || REFERENCE_SLUG);
      targetHostname = CANONICAL_HOSTNAME;
      targetUserId = await tenantByHostname(admin, CANONICAL_HOSTNAME);
      targetSlug = CANONICAL_SLUG;
      targetLabel = "SiteLab Base — carga demonstrativa canônica";
    } else if (action === "clone_to_tenant") {
      if (body.include_demo_load !== true) {
        // A carga é OPCIONAL: sem escolha explícita, o tenant nasce vazio.
        return json({ success: true, copied: false, reason: "demo_load_not_requested" });
      }
      sourceSlug = CANONICAL_SLUG;
      targetHostname = body.target_hostname ? String(body.target_hostname) : null;
      /*
       * Destino AUTORITATIVO pelo hostname provisionado. `target_user_id` nunca
       * é aceito quando há hostname (não pode contradizê-lo) e é proibido em
       * chamadas por token de provisionamento — assim um token não aponta para
       * um tenant arbitrário fora do fluxo autorizado.
       */
      const requestedUserId = body.target_user_id ? String(body.target_user_id) : null;
      if (targetHostname) {
        targetUserId = await tenantByHostname(admin, targetHostname);
        if (requestedUserId && requestedUserId !== targetUserId) {
          return json({ error: "Destino não corresponde ao hostname provisionado" }, 400);
        }
      } else if (requestedUserId && isServiceCall) {
        targetUserId = requestedUserId;
      } else {
        return json({ error: "Informe o hostname provisionado do tenant de destino" }, 400);
      }
      targetSlug = targetUserId ? demoLoadSlug(targetUserId) : "";
      targetLabel = "White label demonstrativo — carga copiada do SiteLab Base";
    } else {
      return json({ error: "Ação inválida" }, 400);
    }

    if (!targetUserId) return json({ error: "Tenant de destino não encontrado" }, 400);

    const source = await scenarioBySlug(admin, sourceSlug);
    if (!source || source.is_demo !== true) {
      return json({ error: "Cenário de origem não encontrado" }, 404);
    }
    if (source.user_id === targetUserId) {
      return json({ error: "Origem e destino são o mesmo tenant" }, 400);
    }

    /** Pipeline padrão do destino (idempotente na própria função do banco). */
    await admin.rpc("ensure_default_operation_stages", { _user_id: targetUserId });

    /** Cenário de destino: marcação auditável que autoriza as datas relativas. */
    const { data: targetScenario, error: targetScenarioError } = await admin
      .from("demo_scenarios")
      .upsert(
        {
          slug: targetSlug,
          user_id: targetUserId,
          label: targetLabel,
          hostname: targetHostname,
          is_demo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (targetScenarioError || !targetScenario) {
      return json({ error: "Falha ao registrar o cenário de destino" }, 400);
    }
    const targetScenarioId = targetScenario.id as string;

    const sourceMap = await mappedIds(admin, source.id);
    const targetMap = await mappedIds(admin, targetScenarioId);

    /** Delta calculado NO MOMENTO da cópia: embarque a 7 dias de hoje. */
    const today = saoPauloToday();
    const tripIds = sourceMap.byTable.get("trips") ?? [];
    let anchorStart: string | null = null;
    if (tripIds.length) {
      const { data: trips } = await admin
        .from("trips")
        .select("start_date")
        .in("id", tripIds)
        .order("start_date", { ascending: true });
      anchorStart = (trips ?? []).find((t) => !!t.start_date)?.start_date as string | null;
    }
    const delta = anchorStart ? computeDelta(anchorStart, today) : 0;

    /* ------------------------------- cópia profunda ------------------------------- */
    const idMap: IdMap = new Map();
    for (const [role, entry] of targetMap.byRole) {
      const [table, sourceId] = role.split(":");
      if (table && sourceId && entry.table === table) idMapSet(idMap, table, sourceId, entry.id);
    }

    const created: Record<string, number> = {};
    const reused: Record<string, number> = {};
    const mappings: { table_name: string; record_id: string; record_role: string }[] = [];

    for (const spec of COPY_ORDER) {
      const ids = sourceMap.byTable.get(spec.table);
      if (!ids?.length) continue;
      const { data: rows, error } = await admin
        .from(spec.table)
        .select("*")
        .in("id", ids);
      if (error) return json({ error: `Falha ao ler ${spec.table}: ${error.message}` }, 400);

      for (const source_row of rows ?? []) {
        const sourceId = String(source_row.id);
        const role = copyRole(spec.table, sourceId);
        const already = targetMap.byRole.get(role);
        if (already) {
          idMapSet(idMap, spec.table, sourceId, already.id);
          reused[spec.table] = (reused[spec.table] ?? 0) + 1;
          continue;
        }

        const remapped = remapRow(spec, source_row as Record<string, unknown>, {
          tenantId: targetUserId,
          idMap,
          delta,
        });
        if (!remapped.ok) continue;

        /**
         * Operações: o trigger `auto_create_operation_on_close` cria uma operação
         * automática quando a oportunidade copiada entra em estágio fechado.
         * Em vez de duplicar, o cenário ADOTA essa operação vazia.
         */
        let adoptedId: string | null = null;
        if (spec.table === "operations" && remapped.row.opportunity_id) {
          const { data: candidates } = await admin
            .from("operations")
            .select("id")
            .eq("user_id", targetUserId)
            .eq("opportunity_id", remapped.row.opportunity_id as string);
          for (const candidate of candidates ?? []) {
            const { count } = await admin
              .from("operation_services")
              .select("id", { count: "exact", head: true })
              .eq("operation_id", candidate.id as string);
            if (!count) {
              adoptedId = candidate.id as string;
              break;
            }
          }
        }

        /**
         * A ficha de reserva tem numeração própria por agência: o número da
         * origem nunca é copiado, é gerado no destino (como no fluxo real).
         */
        if (spec.table === "travel_files") {
          const { data: lastFile } = await admin
            .from("travel_files")
            .select("file_number")
            .eq("agency_id", targetUserId)
            .order("file_number", { ascending: false })
            .limit(1)
            .maybeSingle();
          remapped.row.file_number = ((lastFile?.file_number as number | null) ?? 0) + 1;
        }

        let newId: string | null = null;
        if (adoptedId) {
          const { error: upError } = await admin
            .from(spec.table)
            .update(remapped.row)
            .eq("id", adoptedId)
            .eq("user_id", targetUserId);
          if (upError) return json({ error: `Falha ao adotar ${spec.table}: ${upError.message}` }, 400);
          newId = adoptedId;
        } else {
          const { data: inserted, error: insError } = await admin
            .from(spec.table)
            .insert(remapped.row)
            .select("id")
            .single();
          if (insError || !inserted) {
            return json({ error: `Falha ao copiar ${spec.table}: ${insError?.message}` }, 400);
          }
          newId = inserted.id as string;
        }

        idMapSet(idMap, spec.table, sourceId, newId);
        /**
         * O vínculo é gravado IMEDIATAMENTE: se a cópia falhar mais adiante, a
         * reexecução reaproveita o que já existe em vez de duplicar registros.
         */
        const { error: linkError } = await admin.from("demo_scenario_records").insert({
          scenario_id: targetScenarioId,
          table_name: spec.table,
          record_id: newId,
          record_role: role,
        });
        if (linkError) return json({ error: `Falha ao mapear ${spec.table}` }, 400);
        targetMap.byRole.set(role, { table: spec.table, id: newId });
        created[spec.table] = (created[spec.table] ?? 0) + 1;
      }
    }

    /**
     * Comissões automáticas do destino: geradas por trigger a partir dos produtos
     * copiados. São parte legítima do financeiro e por isso também entram no mapa
     * (auditoria e cleanup completos), sem serem copiadas da origem.
     */
    const targetSaleIds = [...(idMap.get("sales")?.values() ?? [])];
    if (targetSaleIds.length) {
      const { data: autoIncomes } = await admin
        .from("income_entries")
        .select("id, sale_product_id")
        .eq("user_id", targetUserId)
        .in("sale_id", targetSaleIds)
        .not("sale_product_id", "is", null);
      for (const row of autoIncomes ?? []) {
        const role = `income_entries:auto:${row.sale_product_id}`;
        if (targetMap.byRole.has(role)) continue;
        mappings.push({
          table_name: "income_entries",
          record_id: row.id as string,
          record_role: role,
        });
      }
    }

    /**
     * Operações criadas automaticamente pelo trigger de oportunidade ganha no
     * destino (além da operação principal, já adotada). Entram no mapa para que
     * auditoria e limpeza cubram o cenário inteiro — nunca ficam órfãs.
     */
    const targetOpportunityIds = [...(idMap.get("opportunities")?.values() ?? [])];
    if (targetOpportunityIds.length) {
      const { data: autoOps } = await admin
        .from("operations")
        .select("id, opportunity_id")
        .eq("user_id", targetUserId)
        .in("opportunity_id", targetOpportunityIds);
      for (const row of autoOps ?? []) {
        const role = `operations:auto:${row.opportunity_id}`;
        const alreadyMapped = [...targetMap.byRole.values()].some((v) => v.id === row.id);
        if (alreadyMapped || targetMap.byRole.has(role)) continue;
        mappings.push({ table_name: "operations", record_id: row.id as string, record_role: role });
      }
    }

    if (mappings.length) {
      const { error: mapError } = await admin
        .from("demo_scenario_records")
        .insert(mappings.map((m) => ({ ...m, scenario_id: targetScenarioId })));
      if (mapError) return json({ error: "Falha ao mapear os registros copiados" }, 400);
    }

    /**
     * Neutralização de identidade: contatos fictícios copiados nunca podem
     * carregar o domínio da agência de referência. Só e-mails de demonstração
     * são reescritos — textos e valores editados por quem mantém a carga
     * permanecem intactos.
     */
    /**
     * Links públicos: o código de acesso é gerado pelos triggers reais, mas o
     * roteiro e a viagem também precisam do próprio token de compartilhamento.
     * Nunca é copiado da origem — é novo em cada tenant.
     */
    for (const table of ["itineraries", "trips", "quotes"] as const) {
      for (const copiedId of idMap.get(table)?.values() ?? []) {
        const { data: row } = await admin
          .from(table)
          .select("id, share_token")
          .eq("id", copiedId)
          .maybeSingle();
        if (row && !row.share_token) {
          const token = [...crypto.getRandomValues(new Uint8Array(16))]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          await admin.from(table).update({ share_token: token }).eq("id", copiedId);
        }
      }
    }

    const neutralDomain = `demo.${targetHostname ?? "sitelab.local"}`;
    const copiedClientIds = [...(idMap.get("clients")?.values() ?? [])];
    if (copiedClientIds.length) {
      const { data: copiedClients } = await admin
        .from("clients")
        .select("id, email")
        .in("id", copiedClientIds);
      for (const row of copiedClients ?? []) {
        const email = String(row.email ?? "");
        if (!email.includes("@demo.") || email.endsWith(`@${neutralDomain}`)) continue;
        await admin
          .from("clients")
          .update({ email: `${email.split("@")[0]}@${neutralDomain}` })
          .eq("id", row.id as string)
          .eq("user_id", targetUserId);
      }
    }

    /* ---------------- cartões auxiliares do Kanban (poucos, sintéticos) ---------------- */
    const kanbanExtras: { client: string; city: string; destination: string; stage: string }[] = [
      {
        client: "Paulo Ribeiro (demonstração)",
        city: "Porto Alegre",
        destination: "Buenos Aires — primeira viagem",
        stage: "new_contact",
      },
      {
        client: "Camila Duarte (demonstração)",
        city: "Curitiba",
        destination: "Santiago e Valle Nevado — proposta enviada",
        stage: "quote_sent",
      },
      {
        client: "Mariana Souza",
        city: "Canoas",
        destination: "Resort em Porto de Galinhas — ajustes",
        stage: "negotiation",
      },
    ];
    const kanban: Record<string, string> = {};
    for (const extra of kanbanExtras) {
      const role = `kanban:${extra.stage}`;
      if (targetMap.byRole.has(role)) {
        kanban[extra.stage] = targetMap.byRole.get(role)!.id;
        continue;
      }
      let { data: client } = await admin
        .from("clients")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("name", extra.client)
        .maybeSingle();
      if (!client?.id) {
        const inserted = await admin
          .from("clients")
          .insert({
            user_id: targetUserId,
            name: extra.client,
            city: extra.city,
            status: "lead",
            internal_notes: "Cartão auxiliar de demonstração — dados fictícios.",
          })
          .select("id")
          .single();
        client = inserted.data;
        if (client?.id) {
          await admin.from("demo_scenario_records").insert({
            scenario_id: targetScenarioId,
            table_name: "clients",
            record_id: client.id,
            record_role: `kanban-client:${extra.stage}`,
          });
        }
      }
      if (!client?.id) continue;
      const { data: opp } = await admin
        .from("opportunities")
        .insert({
          user_id: targetUserId,
          client_id: client.id,
          destination: extra.destination,
          stage: extra.stage,
          adults_count: 2,
          children_count: 0,
          passengers_count: 2,
          estimated_value: extra.stage === "new_contact" ? 9800 : 21500,
          notes: "Cartão auxiliar de demonstração — não é a jornada principal.",
        })
        .select("id")
        .single();
      if (opp?.id) {
        kanban[extra.stage] = opp.id;
        await admin.from("demo_scenario_records").insert({
          scenario_id: targetScenarioId,
          table_name: "opportunities",
          record_id: opp.id,
          record_role: role,
        });
      }
    }

    /* ------------------- conta fictícia da Área do Cliente (sem e-mail) ------------------- */
    let clientAreaEmail: string | null = null;
    let clientAreaPassword: string | null = null;
    const anaSourceId = (sourceMap.byTable.get("clients") ?? [])[0];
    const mainTripId = [...(idMap.get("trips")?.values() ?? [])][0] ?? null;
    const mainOperationId = [...(idMap.get("operations")?.values() ?? [])][0] ?? null;
    /*
     * O cliente principal é SEMPRE o titular da viagem canônica (nunca o
     * primeiro id do mapa, que depende da ordem de inserção e pode cair em um
     * cartão sintético do Kanban).
     */
    let tripClientId: string | null = null;
    if (mainTripId) {
      const { data: tripRow } = await admin
        .from("trips")
        .select("client_id")
        .eq("id", mainTripId)
        .maybeSingle();
      tripClientId = (tripRow?.client_id as string | null) ?? null;
    }
    const mainClientId =
      tripClientId ??
      (anaSourceId ? idMapGet(idMap, "clients", anaSourceId) : undefined) ??
      [...(idMap.get("clients")?.values() ?? [])][0];

    if (mainClientId && body.create_client_area !== false) {
      const emailBase = String(body.client_area_email || "").trim().toLowerCase();
      clientAreaEmail = emailBase || `ana.martins@demo.${targetHostname ?? "sitelab.local"}`;
      const { data: account } = await admin
        .from("client_area_accounts")
        .select("id, client_id")
        .eq("agency_id", targetUserId)
        .eq("email_normalized", clientAreaEmail)
        .maybeSingle();
      let accountId = account?.id as string | undefined;
      if (!accountId) {
        clientAreaPassword = strongPassword();
        const { data: inserted, error: accError } = await admin
          .from("client_area_accounts")
          .insert({
            agency_id: targetUserId,
            client_id: mainClientId,
            email_normalized: clientAreaEmail,
            password_hash: await bcrypt.hash(clientAreaPassword, 10),
            status: "active",
            must_change_password: false,
            password_set_by: "agency_generated",
          })
          .select("id")
          .single();
        if (accError) {
          return json({ error: `Falha ao criar a conta da Área do Cliente: ${accError.message}` }, 400);
        }
        accountId = inserted?.id as string;
      } else {
        /* Corrige vínculo se a conta ficou apontada para outro cliente. */
        if (account?.client_id && account.client_id !== mainClientId) {
          await admin
            .from("client_area_accounts")
            .update({ client_id: mainClientId })
            .eq("id", accountId);
        }
        if (body.reset_client_area_password === true) {
          clientAreaPassword = strongPassword();
          await admin
            .from("client_area_accounts")
            .update({
              password_hash: await bcrypt.hash(clientAreaPassword, 10),
              password_updated_at: new Date().toISOString(),
              password_set_by: "agency_generated",
            })
            .eq("id", accountId);
        }
      }

      if (accountId && mainTripId) {
        const { data: grant } = await admin
          .from("client_area_wallet_grants")
          .select("id, client_id, account_id")
          .eq("agency_id", targetUserId)
          .eq("trip_id", mainTripId)
          .maybeSingle();
        if (grant?.id && (grant.client_id !== mainClientId || grant.account_id !== accountId)) {
          await admin
            .from("client_area_wallet_grants")
            .update({ client_id: mainClientId, account_id: accountId })
            .eq("id", grant.id);
        }
        if (!grant?.id) {
          const { data: newGrant } = await admin
            .from("client_area_wallet_grants")
            .insert({
              agency_id: targetUserId,
              account_id: accountId,
              client_id: mainClientId,
              operation_id: mainOperationId,
              trip_id: mainTripId,
              token_hash: `demo-${mainTripId}`,
              expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
            })
            .select("id")
            .single();
          if (newGrant?.id) {
            await admin.from("demo_scenario_records").insert({
              scenario_id: targetScenarioId,
              table_name: "client_area_wallet_grants",
              record_id: newGrant.id,
              record_role: "carteira-principal",
            });
          }
        }
      }
    }

    /* --------------------- auditoria de isolamento (sem vazamento) --------------------- */
    const { byTable: finalByTable } = await mappedIds(admin, targetScenarioId);
    const targetIds = new Set<string>();
    for (const ids of finalByTable.values()) for (const id of ids) targetIds.add(id);
    const leaks: { table: string; id: string; columns: string[] }[] = [];
    for (const spec of COPY_ORDER) {
      const ids = finalByTable.get(spec.table);
      if (!ids?.length) continue;
      const { data: rows } = await admin.from(spec.table).select("*").in("id", ids);
      for (const row of rows ?? []) {
        const columns = crossTenantRefs(spec.table, row as Record<string, unknown>, targetIds);
        if (columns.length) leaks.push({ table: spec.table, id: String(row.id), columns });
      }
    }

    const counts: Record<string, number> = {};
    for (const [table, ids] of finalByTable) counts[table] = ids.length;

    return json({
      success: true,
      action,
      source_scenario: source.slug,
      target_scenario: targetSlug,
      target_user_id: targetUserId,
      target_scenario_id: targetScenarioId,
      today,
      delta,
      window: targetWindow(today),
      created,
      reused,
      mapped_total: [...finalByTable.values()].reduce((s, ids) => s + ids.length, 0),
      counts,
      kanban,
      cross_tenant_leaks: leaks,
      client_area_email: clientAreaEmail,
      /** Presente apenas quando a senha foi gerada nesta chamada. */
      client_area_password: clientAreaPassword,
    });
  } catch (err) {
    console.error("demo-canonical-load error", err);
    return json({ error: "Erro ao processar solicitação." }, 500);
  }
});
