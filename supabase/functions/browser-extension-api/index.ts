/**
 * browser-extension-api
 *
 * Ponte autenticada entre a extensão Chrome "Agente de Sonhos para WhatsApp" e
 * o CRM existente. Reutiliza integralmente as tabelas atuais (clients,
 * opportunities, pipeline_stages, opportunity_history, opportunity_notes,
 * opportunity_followups) e respeita agência, usuário, permissões, escopo e
 * permissões de etapa.
 *
 * Regras invioláveis:
 * - Sem JWT válido não existe operação (nem leitura).
 * - `agencyId` e `teamMemberId` são derivados NO SERVIDOR (user_agency_id /
 *   team_self_member_id). Nada enviado pelo cliente é confiado.
 * - Todas as leituras/mutações do CRM usam o cliente com o JWT do usuário: o
 *   RLS continua sendo a autoridade final.
 * - Uso administrativo LIMITADO de service role: apenas para ler o vínculo do
 *   colaborador e suas permissões (agency_team_members,
 *   agency_team_permissions, agency_team_stage_permissions), cujas políticas
 *   RLS liberam SELECT somente ao owner. O service client nunca lê clientes ou
 *   oportunidades e nunca executa mutações.
 * - Nunca envia mensagem pelo WhatsApp e nunca devolve CPF/CNPJ ou credenciais.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";
import {
  assertAction, assertCanMoveStage, assertPermissionReadOk, assertTeamMembershipBinding,
  budgetSentNote, clampInt, filterVisibleStages, ilikeContainsPattern, mergeContactMatches,
  phoneMatchVariants,
  isUuid, isUsablePhone, normalizePhone, publicContact, publicOpportunity, safeAmount,
  safeHttpUrl, safeText, teamPermissionFilter, validateDestination, validateIsoDate, validateName,
  type BridgeError,
} from "../_shared/extensionBridge.ts";
import {
  agendaDeepLink, buildOpportunityUpdate, civilDayWindow, civilDateInTimeZone, clampLimit,
  clientDeepLink, createQuoteDeepLink, opportunityDeepLink, publicAgendaEvent, publicClientCompany,
  publicCompany, publicFollowup, publicOperation, publicOpportunityHistory, publicOpportunityNote,
  publicQuote, publicTrip, validateFollowupFilter, validateIsoDateTime, validateRelationshipType,
  validateTimeZone,
} from "../_shared/extensionBridge.ts";

const corsHeaders = {
  // A extensão chama de origens `chrome-extension://<id>` e não usa cookies:
  // a autorização vem exclusivamente do Bearer JWT.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (e: BridgeError) => json({ error: e.error }, e.status);

const PERMISSION_KEYS = [
  "clients.view", "clients.create",
  "opportunities.view", "opportunities.create", "opportunities.edit",
];

/**
 * Chaves adicionais usadas pelo painel "Hoje" e pelas leituras 0.4.
 * Somente chaves REAIS já usadas pela plataforma.
 */
const PERMISSION_KEYS_V04 = [
  "clients.edit", "clients.delete",
  "agenda.view", "agenda.edit",
  "dashboard.view",
  "operations.view",
  "quotes.view",
  "tasks.view", "tasks.edit",
  "opportunities.generate_quote",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail({ status: 405, error: "Método não permitido." });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+.+/i.test(authHeader)) {
      return fail({ status: 401, error: "Sessão não encontrada. Entre na plataforma e tente novamente." });
    }

    // Cliente com o JWT do usuário: RLS ativo em toda leitura e mutação.
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return fail({ status: 401, error: "Sessão expirada. Entre novamente na plataforma." });

    const rate = await checkRateLimit(user.id, "browser-extension-api", 90, 60);
    if (!rate.allowed) return rateLimitResponse(corsHeaders, rate.retryAfterMs);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const actionError = assertAction(body.action);
    if (actionError) return fail(actionError);
    const action = String(body.action);

    // ── Identidade derivada no servidor ────────────────────────────────────
    const [{ data: agencyRaw }, { data: memberRaw }] = await Promise.all([
      client.rpc("user_agency_id", { _uid: user.id }),
      client.rpc("team_self_member_id"),
    ]);
    const agencyId = (agencyRaw as string | null) ?? user.id;
    const teamMemberId = (memberRaw as string | null) ?? null;
    const isTeamMember = !!teamMemberId;
    if (!isUuid(agencyId)) return fail({ status: 403, error: "Conta sem agência vinculada." });

    // Permissões do colaborador (master ignora: acesso total).
    let permissionSet = new Set<string>();
    let stagePerms: { stage_id: string; can_view: boolean; can_edit: boolean; can_move: boolean }[] = [];
    if (isTeamMember) {
      // As políticas RLS de agency_team_permissions / _stage_permissions liberam
      // SELECT somente ao owner (auth.uid() = agency_id). O colaborador não
      // consegue ler as próprias permissões pelo JWT — por isso um service
      // client de leitura administrativa, restrito a estas três tabelas.
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY ausente");
        return fail({ status: 403, error: "Não foi possível validar suas permissões. Tente novamente." });
      }
      const adminRead = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const scope = teamPermissionFilter(agencyId, teamMemberId);

      // Vínculo triplo antes de qualquer leitura de permissão (fail-closed).
      const { data: memberRows, error: memberError } = await adminRead
        .from("agency_team_members")
        .select("id, auth_user_id, agency_id, status")
        .eq("id", scope.team_member_id)
        .eq("auth_user_id", user.id)
        .eq("agency_id", scope.agency_id)
        .eq("status", "active")
        .limit(2);
      const memberReadError = assertPermissionReadOk(memberError);
      if (memberReadError) return fail(memberReadError);
      const bindingError = assertTeamMembershipBinding({
        rows: memberRows as { id: unknown; auth_user_id: unknown; agency_id: unknown; status?: unknown }[] | null,
        teamMemberId,
        authUserId: user.id,
        agencyId,
      });
      if (bindingError) return fail(bindingError);

      const [{ data: perms, error: permsError }, { data: sperms, error: spermsError }] = await Promise.all([
        adminRead.from("agency_team_permissions")
          .select("permission_key, enabled")
          .eq("agency_id", scope.agency_id)
          .eq("team_member_id", scope.team_member_id),
        adminRead.from("agency_team_stage_permissions")
          .select("stage_id, can_view, can_edit, can_move")
          .eq("agency_id", scope.agency_id)
          .eq("team_member_id", scope.team_member_id)
          .eq("pipeline_type", "opportunities"),
      ]);
      const permsReadError = assertPermissionReadOk(permsError, spermsError);
      if (permsReadError) return fail(permsReadError);

      (perms ?? []).forEach((p: Record<string, unknown>) => {
        if (p.enabled) permissionSet.add(String(p.permission_key));
      });
      stagePerms = (sperms ?? []) as typeof stagePerms;
    }
    const can = (key: string) => !isTeamMember || permissionSet.has(key);
    const requirePermission = (key: string): BridgeError | null =>
      can(key) ? null : { status: 403, error: "Você não possui permissão para executar esta ação." };

    const loadStages = async () => {
      const { data } = await client
        .from("pipeline_stages")
        .select("id, name, legacy_key, position, color")
        .eq("user_id", agencyId)
        .order("position", { ascending: true });
      return filterVisibleStages((data ?? []) as { id: string; name: string; legacy_key: string | null; position: number; color: string }[], isTeamMember, stagePerms);
    };

    /** Oportunidade visível dentro da agência (RLS + escopo aplicados). */
    const loadOpportunity = async (id: unknown) => {
      if (!isUuid(id)) return null;
      const { data } = await client
        .from("opportunities")
        .select("id, user_id, client_id, stage, stage_id, destination")
        .eq("id", id as string)
        .eq("user_id", agencyId)
        .maybeSingle();
      return data as Record<string, unknown> | null;
    };

    const recordHistory = async (opportunityId: string, fromName: string | null, toName: string, notes?: string) => {
      await client.from("opportunity_history").insert({
        opportunity_id: opportunityId,
        from_stage: fromName,
        to_stage: toName,
        ...(notes ? { notes } : {}),
      });
    };

    /** Move a oportunidade para `stageId` aplicando a guarda de etapas. */
    const moveStage = async (opportunityId: unknown, stageId: unknown, noteContent?: string) => {
      const opp = await loadOpportunity(opportunityId);
      if (!opp) return fail({ status: 404, error: "Oportunidade não encontrada." });
      const stages = await loadStages();
      const target = stages.find(s => s.id === stageId);
      if (!target) return fail({ status: 404, error: "Etapa não encontrada nesta agência." });
      const fromStageId = (opp.stage_id as string | null) ?? null;
      const guard = assertCanMoveStage({ isTeamMember, fromStageId, toStageId: target.id, permissions: stagePerms });
      if (guard) return fail(guard);

      const { error: updateError } = await client
        .from("opportunities")
        .update({ stage_id: target.id })
        .eq("id", opp.id as string);
      if (updateError) {
        console.error("stage update:", updateError.message);
        return fail({ status: 403, error: "Não foi possível mover a oportunidade." });
      }

      const fromName = stages.find(s => s.id === fromStageId)?.name ?? (opp.stage as string | null) ?? null;
      await recordHistory(opp.id as string, fromName, target.name);
      if (noteContent) {
        await client.from("opportunity_notes").insert({
          opportunity_id: opp.id as string,
          user_id: agencyId,
          content: noteContent,
        });
      }
      return json({
        opportunity_id: opp.id,
        stage: { id: target.id, name: target.name, legacy_key: target.legacy_key },
      });
    };

    switch (action) {
      // ── a) context ──────────────────────────────────────────────────────
      case "context": {
        const stages = await loadStages();
        return json({
          user: { id: user.id, email: user.email ?? null },
          agencyId,
          teamMemberId,
          mode: isTeamMember ? "collaborator" : "master",
          permissions: Object.fromEntries(
            [...PERMISSION_KEYS, ...PERMISSION_KEYS_V04].map(k => [k, can(k)]),
          ),
          extension_api_version: "0.4",
          stages: stages.map(s => ({
            id: s.id, name: s.name, legacy_key: s.legacy_key, position: s.position,
            color: s.color, can_view: s.can_view, can_edit: s.can_edit, can_move: s.can_move,
          })),
        });
      }

      // ── b) lookup_contact ───────────────────────────────────────────────
      case "lookup_contact": {
        const denied = requirePermission("clients.view");
        if (denied) return fail(denied);
        const digits = normalizePhone(body.phone);
        const name = safeText(body.name, 120);

        if (isUsablePhone(digits)) {
          const { data } = await client
            .from("clients")
            .select("id, name, phone, email, status, created_at")
            .eq("user_id", agencyId)
            .eq("phone_normalized", digits)
            .order("created_at", { ascending: true })
            .limit(1);
          const hit = (data ?? [])[0] as Record<string, unknown> | undefined;
          if (hit) return json({ contact: publicContact(hit), matched_by: "phone" });
        }

        if (name.length >= 2) {
          const { data } = await client
            .from("clients")
            .select("id, name, phone, email, status, created_at")
            .eq("user_id", agencyId)
            .ilike("name", name)
            .order("created_at", { ascending: true })
            .limit(5);
          const hit = (data ?? [])[0] as Record<string, unknown> | undefined;
          if (hit) return json({ contact: publicContact(hit), matched_by: "name" });
        }

        return json({ contact: null, matched_by: null });
      }

      // ── b2) search_contacts ─────────────────────────────────────────────
      case "search_contacts": {
        const denied = requirePermission("clients.view");
        if (denied) return fail(denied);
        const digits = normalizePhone(body.phone);
        const name = safeText(body.name, 120);
        const usablePhone = isUsablePhone(digits);
        const phoneVariants = phoneMatchVariants(digits);
        if (!usablePhone && name.length < 2) {
          return fail({ status: 400, error: "Informe um telefone válido ou pelo menos 2 caracteres do nome." });
        }

        const columns = "id, name, phone, email, status, created_at";
        let phoneRows: Record<string, unknown>[] = [];
        let nameRows: Record<string, unknown>[] = [];

        if (phoneVariants.length > 0) {
          const { data } = await client
            .from("clients")
            .select(columns)
            .eq("user_id", agencyId)
            .in("phone_normalized", phoneVariants)
            .order("created_at", { ascending: true })
            .limit(10);
          phoneRows = (data ?? []) as Record<string, unknown>[];
        }

        if (name.length >= 2) {
          const { data } = await client
            .from("clients")
            .select(columns)
            .eq("user_id", agencyId)
            .ilike("name", ilikeContainsPattern(name))
            .order("created_at", { ascending: true })
            .limit(10);
          nameRows = (data ?? []) as Record<string, unknown>[];
        }

        return json({
          contacts: mergeContactMatches(phoneRows, nameRows, 10).map(r => publicContact(r)),
        });
      }

      // ── c) create_contact ───────────────────────────────────────────────
      case "create_contact": {
        const denied = requirePermission("clients.create");
        if (denied) return fail(denied);
        const nameCheck = validateName(body.name);
        if (!nameCheck.valid) return fail(nameCheck.error);
        const digits = normalizePhone(body.phone);
        if (digits && !isUsablePhone(digits)) {
          return fail({ status: 400, error: "Telefone inválido: informe entre 8 e 15 dígitos." });
        }

        if (digits && can("clients.view")) {
          const { data: dupes } = await client
            .from("clients")
            .select("id, name, phone, email, status, created_at")
            .eq("user_id", agencyId)
            .eq("phone_normalized", digits)
            .limit(1);
          const dupe = (dupes ?? [])[0] as Record<string, unknown> | undefined;
          if (dupe) {
            return json({ error: "Já existe um contato com este telefone.", contact: publicContact(dupe) }, 409);
          }
        }

        const { data, error } = await client
          .from("clients")
          .insert({
            user_id: agencyId,
            name: nameCheck.value,
            phone: digits ? safeText(body.phone, 32) : null,
            status: "lead",
            notes: "Origem: WhatsApp (extensão Agente de Sonhos).",
            ...(isTeamMember ? { created_by_team_member_id: teamMemberId } : {}),
          })
          .select("id, name, phone, email, status, created_at")
          .single();
        if (error) {
          console.error("create_contact:", error.message);
          return fail({ status: 403, error: "Não foi possível criar o contato." });
        }
        return json({ contact: publicContact(data as Record<string, unknown>) }, 201);
      }

      // ── d) list_opportunities ───────────────────────────────────────────
      case "list_opportunities": {
        const denied = requirePermission("opportunities.view");
        if (denied) return fail(denied);
        const contactId = body.contactId;
        if (!isUuid(contactId)) return fail({ status: 400, error: "Contato inválido." });

        const { data: contact } = await client
          .from("clients").select("id").eq("id", contactId as string).eq("user_id", agencyId).maybeSingle();
        if (!contact) return fail({ status: 404, error: "Contato não encontrado." });

        const { data } = await client
          .from("opportunities")
          .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, adults_count, children_count, estimated_value, notes, follow_up_date, follow_up_at, travel_context, company_id, created_at, pipeline_stage:pipeline_stages(name, legacy_key), company:companies(name, trade_name)")
          .eq("user_id", agencyId)
          .eq("client_id", contactId as string)
          .order("created_at", { ascending: false })
          .limit(50);

        const stages = await loadStages();
        const visibleIds = new Set(stages.map(s => s.id));
        const rows = ((data ?? []) as Record<string, unknown>[])
          .filter(r => !isTeamMember || !r.stage_id || visibleIds.has(r.stage_id as string))
          .map(publicOpportunity);
        return json({ opportunities: rows });
      }

      // ── e) get_pipeline_stages ──────────────────────────────────────────
      case "get_pipeline_stages": {
        const denied = requirePermission("opportunities.view");
        if (denied) return fail(denied);
        const stages = await loadStages();
        return json({
          stages: stages.map(s => ({
            id: s.id, name: s.name, legacy_key: s.legacy_key, position: s.position,
            color: s.color, can_view: s.can_view, can_edit: s.can_edit, can_move: s.can_move,
          })),
        });
      }

      // ── f) create_opportunity ───────────────────────────────────────────
      case "create_opportunity": {
        const denied = requirePermission("opportunities.create");
        if (denied) return fail(denied);
        const contactId = body.contactId;
        if (!isUuid(contactId)) return fail({ status: 400, error: "Contato inválido." });
        const destCheck = validateDestination(body.destination);
        if (!destCheck.valid) return fail(destCheck.error);

        const { data: contact } = await client
          .from("clients").select("id").eq("id", contactId as string).eq("user_id", agencyId).maybeSingle();
        if (!contact) return fail({ status: 404, error: "Contato não encontrado." });

        // Contexto de viagem: default 0.3-compatível (personal / sem empresa).
        const travelContext = "travelContext" in body
          ? validateTravelContext(body.travelContext)
          : "personal";
        if (!travelContext) {
          return fail({ status: 400, error: "Contexto de viagem inválido (personal ou corporate)." });
        }
        const companyId = isUuid(body.companyId) ? (body.companyId as string) : null;
        const pairError = assertTravelContextPair(travelContext, companyId);
        if (pairError) return fail(pairError);

        if (travelContext === "corporate" && companyId) {
          const { data: company } = await client
            .from("companies").select("id")
            .eq("id", companyId).eq("user_id", agencyId).maybeSingle();
          if (!company) return fail({ status: 404, error: "Empresa não encontrada nesta agência." });
          const { data: link } = await client
            .from("client_companies").select("id")
            .eq("user_id", agencyId)
            .eq("company_id", companyId)
            .eq("client_id", contactId as string)
            .maybeSingle();
          if (!link) return fail({ status: 400, error: "Empresa não está vinculada a este contato." });
        }

        const { data: firstStage } = await client
          .from("pipeline_stages")
          .select("id, name, legacy_key")
          .eq("user_id", agencyId)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        const adults = clampInt(body.adultsCount, 0, 99, 1);
        const children = clampInt(body.childrenCount, 0, 99, 0);
        const passengers = clampInt(body.passengersCount, 1, 199, Math.max(1, adults + children));

        const { data, error } = await client
          .from("opportunities")
          .insert({
            user_id: agencyId,
            client_id: contactId as string,
            destination: destCheck.value,
            start_date: validateIsoDate(body.startDate),
            end_date: validateIsoDate(body.endDate),
            adults_count: adults,
            children_count: children,
            passengers_count: passengers,
            estimated_value: safeAmount(body.estimatedValue),
            notes: safeText(body.notes, 2000) || null,
            follow_up_date: validateIsoDate(body.followUpDate),
            travel_context: travelContext,
            company_id: companyId,
            stage: (firstStage?.legacy_key as string | null) || "new_contact",
            stage_id: (firstStage?.id as string | null) ?? null,
            ...(isTeamMember ? { created_by_team_member_id: teamMemberId } : {}),
          })
          .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, adults_count, children_count, estimated_value, notes, follow_up_date, follow_up_at, travel_context, company_id, created_at, company:companies(name, trade_name)")
          .single();
        if (error) {
          console.error("create_opportunity:", error.message);
          return fail({ status: 403, error: "Não foi possível criar a oportunidade." });
        }

        await recordHistory(
          (data as Record<string, unknown>).id as string,
          null,
          (firstStage?.name as string | null) || (firstStage?.legacy_key as string | null) || "Novo contato",
        );
        return json({ opportunity: publicOpportunity(data as Record<string, unknown>) }, 201);
      }

      // ── g) update_opportunity_stage ─────────────────────────────────────
      case "update_opportunity_stage": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        if (!isUuid(body.stageId)) return fail({ status: 400, error: "Etapa inválida." });
        return await moveStage(body.opportunityId, body.stageId);
      }

      // ── h) register_budget_sent ─────────────────────────────────────────
      case "register_budget_sent": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        const stages = await loadStages();
        const quoteStage = stages.find(s => s.legacy_key === "quote_sent");
        if (!quoteStage) {
          return fail({ status: 404, error: "Nenhuma etapa de orçamento enviado configurada nesta agência." });
        }
        const url = safeHttpUrl(body.budgetUrl);
        return await moveStage(body.opportunityId, quoteStage.id, budgetSentNote(url));
      }

      // ── i) create_followup ──────────────────────────────────────────────
      case "create_followup": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        // 0.4: aceita `followUpAt` (ISO 8601 COM offset) ou o legado `followUpDate`.
        const timeZone = validateTimeZone(body.timeZone);
        const followUpAt = validateIsoDateTime(body.followUpAt);
        if (body.followUpAt !== undefined && body.followUpAt !== null && !followUpAt) {
          return fail({ status: 400, error: "Informe o horário do follow-up em ISO 8601 com fuso (ex.: 2026-08-20T14:30:00-03:00)." });
        }
        // A data civil vem do fuso validado — nunca de um split simples em UTC.
        const followUpDate = followUpAt
          ? civilDateInTimeZone(followUpAt, timeZone)
          : validateIsoDate(body.followUpDate);
        if (!followUpDate) return fail({ status: 400, error: "Informe a data do follow-up no formato AAAA-MM-DD." });
        const opp = await loadOpportunity(body.opportunityId);
        if (!opp) return fail({ status: 404, error: "Oportunidade não encontrada." });

        const { data, error } = await client
          .from("opportunity_followups")
          .insert({
            opportunity_id: opp.id as string,
            user_id: agencyId,
            follow_up_date: followUpDate,
            follow_up_at: followUpAt,
            time_zone: followUpAt ? timeZone : null,
            created_by: user.id,
            note: safeText(body.note, 1000) || null,
          })
          .select("id, opportunity_id, follow_up_date, follow_up_at, time_zone, note, created_at")
          .single();
        if (error) {
          console.error("create_followup:", error.message);
          return fail({ status: 403, error: "Não foi possível registrar o follow-up." });
        }

        await client.from("opportunities")
          .update({ follow_up_date: followUpDate, follow_up_at: followUpAt })
          .eq("id", opp.id as string);

        return json({ followup: publicFollowup(data as Record<string, unknown>) }, 201);
      }

      // ══════════════════════════════════════════════════════════════════════
      // Versão 0.4
      // ══════════════════════════════════════════════════════════════════════

      // ── j) dashboard_today ──────────────────────────────────────────────
      case "dashboard_today": {
        const win = civilDayWindow(body.timeZone, clampInt(body.horizonDays, 1, 30, 7));
        const limit = clampLimit(body.limit, 20, 50);

        // Follow-ups: SEMPRE individuais (created_by = user.id). Não vaza
        // agenda/follow-up de colegas da mesma agência.
        let overdue: Record<string, unknown>[] = [];
        let today: Record<string, unknown>[] = [];
        let upcoming: Record<string, unknown>[] = [];
        if (can("opportunities.view")) {
          const followupColumns =
            "id, opportunity_id, follow_up_date, follow_up_at, time_zone, note, created_at, " +
            "opportunity:opportunities(destination, client_id, client:clients(name))";
          const base = () => client
            .from("opportunity_followups")
            .select(followupColumns)
            .eq("user_id", agencyId)
            .eq("created_by", user.id);

          const [ov, td, up] = await Promise.all([
            base().lt("follow_up_date", win.today).order("follow_up_date", { ascending: false }).limit(limit),
            base().eq("follow_up_date", win.today).order("follow_up_at", { ascending: true }).limit(limit),
            base().gt("follow_up_date", win.today).lte("follow_up_date", win.horizon_date)
              .order("follow_up_date", { ascending: true }).limit(limit),
          ]);
          overdue = (ov.data ?? []) as Record<string, unknown>[];
          today = (td.data ?? []) as Record<string, unknown>[];
          upcoming = (up.data ?? []) as Record<string, unknown>[];
        }

        // Agenda pessoal do usuário autenticado, sem eventos apagados.
        let events: Record<string, unknown>[] = [];
        if (can("agenda.view")) {
          const { data } = await client
            .from("agency_events")
            .select("id, title, event_type, event_date, event_time, start_at, time_zone, all_day")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .gte("event_date", win.today)
            .lte("event_date", win.horizon_date)
            .order("event_date", { ascending: true })
            .limit(limit);
          events = (data ?? []) as Record<string, unknown>[];
        }

        // Viagens/operações da agência (RLS + permissões decidem a visibilidade).
        // Nenhum dado financeiro é devolvido.
        let operations: Record<string, unknown>[] = [];
        let trips: Record<string, unknown>[] = [];
        if (can("operations.view")) {
          const [ops, trs] = await Promise.all([
            client.from("operations")
              .select("id, title, destination, travel_start_date, travel_end_date, passengers_count, stage")
              .eq("user_id", agencyId)
              .gte("travel_start_date", win.today)
              .order("travel_start_date", { ascending: true })
              .limit(limit),
            client.from("trips")
              .select("id, trip_title, destination, start_date, end_date, status")
              .eq("user_id", agencyId)
              .gte("start_date", win.today)
              .order("start_date", { ascending: true })
              .limit(limit),
          ]);
          operations = (ops.data ?? []) as Record<string, unknown>[];
          trips = (trs.data ?? []) as Record<string, unknown>[];
        }

        return json({
          time_zone: win.time_zone,
          today: win.today,
          horizon_date: win.horizon_date,
          followups: {
            overdue: overdue.map(publicFollowup),
            today: today.map(publicFollowup),
            upcoming: upcoming.map(publicFollowup),
          },
          events: events.map(publicAgendaEvent),
          operations: operations.map(publicOperation),
          trips: trips.map(publicTrip),
          counts: {
            followups_overdue: overdue.length,
            followups_today: today.length,
            followups_upcoming: upcoming.length,
            events: events.length,
            operations: operations.length,
            trips: trips.length,
          },
          links: { agenda_url: agendaDeepLink(win.today) },
        });
      }

      // ── k) get_contact_summary ──────────────────────────────────────────
      case "get_contact_summary": {
        const denied = requirePermission("clients.view");
        if (denied) return fail(denied);
        if (!isUuid(body.contactId)) return fail({ status: 400, error: "Contato inválido." });
        const contactId = body.contactId as string;

        const { data: contact } = await client
          .from("clients")
          .select("id, name, phone, email, status, created_at")
          .eq("id", contactId)
          .eq("user_id", agencyId)
          .maybeSingle();
        if (!contact) return fail({ status: 404, error: "Contato não encontrado." });

        const [{ data: companies }, { data: opps }] = await Promise.all([
          client.from("client_companies")
            .select("id, client_id, company_id, relationship_type, is_primary, company:companies(id, name, trade_name, cnpj_normalized, email, phone, created_at)")
            .eq("user_id", agencyId)
            .eq("client_id", contactId)
            .order("is_primary", { ascending: false })
            .limit(10),
          client.from("opportunities")
            .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, estimated_value, follow_up_date, created_at, travel_context, company_id, pipeline_stage:pipeline_stages(name, legacy_key)")
            .eq("user_id", agencyId)
            .eq("client_id", contactId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        const stages = await loadStages();
        const visibleIds = new Set(stages.map(s => s.id));
        const visibleOpps = ((opps ?? []) as Record<string, unknown>[])
          .filter(r => !isTeamMember || !r.stage_id || visibleIds.has(r.stage_id as string));
        const oppIds = visibleOpps.map(r => r.id as string);

        const [followupsRes, notesRes, historyRes, quotesRes, operationsRes, tripsRes] = await Promise.all([
          oppIds.length
            ? client.from("opportunity_followups")
                .select("id, opportunity_id, follow_up_date, follow_up_at, time_zone, note, created_at")
                .eq("user_id", agencyId).in("opportunity_id", oppIds)
                .order("follow_up_date", { ascending: false }).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
          oppIds.length
            ? client.from("opportunity_notes").select("id, content, created_at")
                .in("opportunity_id", oppIds).order("created_at", { ascending: false }).limit(5)
            : Promise.resolve({ data: [] as unknown[] }),
          oppIds.length
            ? client.from("opportunity_history").select("id, from_stage, to_stage, changed_at")
                .in("opportunity_id", oppIds).order("changed_at", { ascending: false }).limit(5)
            : Promise.resolve({ data: [] as unknown[] }),
          can("quotes.view")
            ? client.from("quotes")
                .select("id, trip_title, destination, status, start_date, end_date, created_at")
                .eq("user_id", agencyId).eq("client_id", contactId)
                .order("created_at", { ascending: false }).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
          can("operations.view")
            ? client.from("operations")
                .select("id, title, destination, travel_start_date, travel_end_date, passengers_count, stage")
                .eq("user_id", agencyId).eq("client_id", contactId)
                .order("travel_start_date", { ascending: false }).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
          can("operations.view")
            ? client.from("trips")
                .select("id, trip_title, destination, start_date, end_date, status")
                .eq("user_id", agencyId).eq("client_id", contactId)
                .order("start_date", { ascending: false }).limit(10)
            : Promise.resolve({ data: [] as unknown[] }),
        ]);

        return json({
          contact: publicContact(contact as Record<string, unknown>),
          companies: ((companies ?? []) as Record<string, unknown>[]).map(publicClientCompany),
          opportunities: visibleOpps.map(r => ({
            ...publicOpportunity(r),
            travel_context: (r.travel_context as string) ?? "personal",
            company_id: (r.company_id as string) ?? null,
            opportunity_url: opportunityDeepLink(r.id as string),
            create_quote_url: createQuoteDeepLink(r.id as string),
          })),
          followups: ((followupsRes.data ?? []) as Record<string, unknown>[]).map(publicFollowup),
          notes: ((notesRes.data ?? []) as Record<string, unknown>[]).map(publicOpportunityNote),
          history: ((historyRes.data ?? []) as Record<string, unknown>[]).map(publicOpportunityHistory),
          quotes: ((quotesRes.data ?? []) as Record<string, unknown>[]).map(publicQuote),
          operations: ((operationsRes.data ?? []) as Record<string, unknown>[]).map(publicOperation),
          trips: ((tripsRes.data ?? []) as Record<string, unknown>[]).map(publicTrip),
          links: {
            client_url: clientDeepLink(contactId),
            agenda_url: agendaDeepLink(null),
          },
        });
      }

      // ── l) update_opportunity ───────────────────────────────────────────
      case "update_opportunity": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        const opp = await loadOpportunity(body.opportunityId);
        if (!opp) return fail({ status: 404, error: "Oportunidade não encontrada." });

        const { patch, error: patchError } = buildOpportunityUpdate(body);
        if (patchError) return fail(patchError);

        // Empresa precisa ser da mesma agência (o banco também valida).
        if (patch.company_id) {
          const { data: company } = await client
            .from("companies").select("id")
            .eq("id", patch.company_id as string).eq("user_id", agencyId).maybeSingle();
          if (!company) return fail({ status: 404, error: "Empresa não encontrada nesta agência." });
        }

        const { data, error } = await client
          .from("opportunities")
          .update(patch)
          .eq("id", opp.id as string)
          .eq("user_id", agencyId)
          .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, estimated_value, follow_up_date, created_at, travel_context, company_id")
          .maybeSingle();
        if (error || !data) {
          console.error("update_opportunity:", error?.message);
          return fail({ status: 403, error: "Não foi possível atualizar a oportunidade." });
        }
        const row = data as Record<string, unknown>;
        return json({
          opportunity: {
            ...publicOpportunity(row),
            travel_context: (row.travel_context as string) ?? "personal",
            company_id: (row.company_id as string) ?? null,
            opportunity_url: opportunityDeepLink(row.id as string),
            create_quote_url: createQuoteDeepLink(row.id as string),
          },
        });
      }

      // ── m) list_followups ───────────────────────────────────────────────
      case "list_followups": {
        const denied = requirePermission("opportunities.view");
        if (denied) return fail(denied);
        const filter = validateFollowupFilter(body.filter);
        const win = civilDayWindow(body.timeZone, clampInt(body.horizonDays, 1, 30, 7));
        const limit = clampLimit(body.limit, 20, 50);

        let query = client
          .from("opportunity_followups")
          .select("id, opportunity_id, follow_up_date, follow_up_at, time_zone, note, created_at, opportunity:opportunities(destination, client_id, client:clients(name))")
          .eq("user_id", agencyId)
          .eq("created_by", user.id);

        if (filter === "overdue") query = query.lt("follow_up_date", win.today);
        else if (filter === "today") query = query.eq("follow_up_date", win.today);
        else if (filter === "upcoming") {
          query = query.gt("follow_up_date", win.today).lte("follow_up_date", win.horizon_date);
        }

        const { data } = await query
          .order("follow_up_date", { ascending: filter !== "overdue" })
          .limit(limit);
        return json({
          filter,
          time_zone: win.time_zone,
          today: win.today,
          followups: ((data ?? []) as Record<string, unknown>[]).map(publicFollowup),
        });
      }

      // ── n) update_followup ──────────────────────────────────────────────
      case "update_followup": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        if (!isUuid(body.followupId)) return fail({ status: 400, error: "Follow-up inválido." });

        // Autoria + agência: RLS é a autoridade, o filtro aqui é defesa extra.
        const { data: existing } = await client
          .from("opportunity_followups")
          .select("id, opportunity_id, created_by, user_id")
          .eq("id", body.followupId as string)
          .eq("user_id", agencyId)
          .eq("created_by", user.id)
          .maybeSingle();
        if (!existing) return fail({ status: 404, error: "Follow-up não encontrado." });

        const timeZone = validateTimeZone(body.timeZone);
        const patch: Record<string, unknown> = {};
        if (body.followUpAt !== undefined) {
          if (body.followUpAt === null) {
            patch.follow_up_at = null;
            patch.time_zone = null;
          } else {
            const at = validateIsoDateTime(body.followUpAt);
            if (!at) return fail({ status: 400, error: "Informe o horário do follow-up em ISO 8601 com fuso." });
            patch.follow_up_at = at;
            patch.time_zone = timeZone;
            patch.follow_up_date = civilDateInTimeZone(at, timeZone);
          }
        }
        if (patch.follow_up_at === undefined && body.followUpDate !== undefined) {
          const date = validateIsoDate(body.followUpDate);
          if (!date) return fail({ status: 400, error: "Informe a data do follow-up no formato AAAA-MM-DD." });
          patch.follow_up_date = date;
        }
        if (patch.follow_up_at === null && body.followUpDate !== undefined) {
          const date = validateIsoDate(body.followUpDate);
          if (date) patch.follow_up_date = date;
        }
        if (body.note !== undefined) patch.note = safeText(body.note, 1000) || null;
        if (Object.keys(patch).length === 0) {
          return fail({ status: 400, error: "Nenhum campo válido para atualizar." });
        }

        const { data, error } = await client
          .from("opportunity_followups")
          .update(patch)
          .eq("id", existing.id as string)
          .select("id, opportunity_id, follow_up_date, follow_up_at, time_zone, note, created_at")
          .maybeSingle();
        if (error || !data) {
          console.error("update_followup:", error?.message);
          return fail({ status: 403, error: "Não foi possível atualizar o follow-up." });
        }
        return json({ followup: publicFollowup(data as Record<string, unknown>) });
      }

      // ── o) complete_followup ────────────────────────────────────────────
      // Mesma semântica da Agenda: concluir remove o follow-up (e o trigger
      // cria a lápide no espelho da agenda).
      case "complete_followup": {
        const denied = requirePermission("opportunities.edit");
        if (denied) return fail(denied);
        if (!isUuid(body.followupId)) return fail({ status: 400, error: "Follow-up inválido." });

        const { data: existing } = await client
          .from("opportunity_followups")
          .select("id, opportunity_id")
          .eq("id", body.followupId as string)
          .eq("user_id", agencyId)
          .eq("created_by", user.id)
          .maybeSingle();
        if (!existing) return fail({ status: 404, error: "Follow-up não encontrado." });

        const { error } = await client
          .from("opportunity_followups")
          .delete()
          .eq("id", existing.id as string);
        if (error) {
          console.error("complete_followup:", error.message);
          return fail({ status: 403, error: "Não foi possível concluir o follow-up." });
        }
        return json({ followup_id: existing.id, completed: true });
      }

      // ── p) list_companies / search_companies ────────────────────────────
      case "list_companies":
      case "search_companies": {
        const denied = requirePermission("clients.view");
        if (denied) return fail(denied);
        const limit = clampLimit(body.limit, 20, 50);
        const term = safeText(body.query ?? body.name, 120);

        let query = client
          .from("companies")
          .select("id, name, trade_name, cnpj_normalized, email, phone, created_at")
          .eq("user_id", agencyId);
        if (action === "search_companies") {
          if (term.length < 2) {
            return fail({ status: 400, error: "Informe pelo menos 2 caracteres da empresa." });
          }
          query = query.ilike("name", ilikeContainsPattern(term));
        }

        const { data } = await query.order("name", { ascending: true }).limit(limit);
        return json({ companies: ((data ?? []) as Record<string, unknown>[]).map(publicCompany) });
      }

      // ── q) create_company ───────────────────────────────────────────────
      case "create_company": {
        const denied = requirePermission("clients.create");
        if (denied) return fail(denied);
        const nameCheck = validateName(body.name);
        if (!nameCheck.valid) return fail(nameCheck.error);
        const cnpj = normalizePhone(body.cnpj);

        const { data, error } = await client
          .from("companies")
          .insert({
            user_id: agencyId,
            name: nameCheck.value,
            trade_name: safeText(body.tradeName, 160) || null,
            cnpj_normalized: cnpj.length >= 11 ? cnpj.slice(0, 20) : null,
            email: safeText(body.email, 160) || null,
            phone: safeText(body.phone, 32) || null,
            notes: safeText(body.notes, 2000) || null,
          })
          .select("id, name, trade_name, cnpj_normalized, email, phone, created_at")
          .single();
        if (error) {
          console.error("create_company:", error.message);
          return fail({ status: 403, error: "Não foi possível criar a empresa." });
        }
        return json({ company: publicCompany(data as Record<string, unknown>) }, 201);
      }

      // ── r) link_contact_company / unlink_contact_company ────────────────
      case "link_contact_company": {
        const denied = requirePermission("clients.edit");
        if (denied) return fail(denied);
        if (!isUuid(body.contactId)) return fail({ status: 400, error: "Contato inválido." });
        if (!isUuid(body.companyId)) return fail({ status: 400, error: "Empresa inválida." });

        const [{ data: contact }, { data: company }] = await Promise.all([
          client.from("clients").select("id").eq("id", body.contactId as string).eq("user_id", agencyId).maybeSingle(),
          client.from("companies").select("id").eq("id", body.companyId as string).eq("user_id", agencyId).maybeSingle(),
        ]);
        if (!contact) return fail({ status: 404, error: "Contato não encontrado." });
        if (!company) return fail({ status: 404, error: "Empresa não encontrada nesta agência." });

        const { data, error } = await client
          .from("client_companies")
          .insert({
            user_id: agencyId,
            client_id: body.contactId as string,
            company_id: body.companyId as string,
            relationship_type: validateRelationshipType(body.relationshipType),
            is_primary: body.isPrimary === true,
          })
          .select("id, client_id, company_id, relationship_type, is_primary, company:companies(id, name, trade_name, cnpj_normalized, email, phone, created_at)")
          .maybeSingle();
        if (error) {
          if (/duplicate key|unique/i.test(error.message)) {
            return json({ error: "Este contato já está vinculado a esta empresa." }, 409);
          }
          console.error("link_contact_company:", error.message);
          return fail({ status: 403, error: "Não foi possível vincular a empresa." });
        }
        return json({ link: publicClientCompany(data as Record<string, unknown>) }, 201);
      }

      case "unlink_contact_company": {
        const denied = requirePermission("clients.edit");
        if (denied) return fail(denied);
        if (!isUuid(body.contactId)) return fail({ status: 400, error: "Contato inválido." });
        if (!isUuid(body.companyId)) return fail({ status: 400, error: "Empresa inválida." });

        const { error } = await client
          .from("client_companies")
          .delete()
          .eq("user_id", agencyId)
          .eq("client_id", body.contactId as string)
          .eq("company_id", body.companyId as string);
        if (error) {
          console.error("unlink_contact_company:", error.message);
          return fail({ status: 403, error: "Não foi possível desvincular a empresa." });
        }
        return json({ unlinked: true });
      }

      case "list_contact_companies": {
        const denied = requirePermission("clients.view");
        if (denied) return fail(denied);
        if (!isUuid(body.contactId)) return fail({ status: 400, error: "Contato inválido." });
        const { data } = await client
          .from("client_companies")
          .select("id, client_id, company_id, relationship_type, is_primary, company:companies(id, name, trade_name, cnpj_normalized, email, phone, created_at)")
          .eq("user_id", agencyId)
          .eq("client_id", body.contactId as string)
          .order("is_primary", { ascending: false })
          .limit(clampLimit(body.limit, 10, 25));
        return json({ companies: ((data ?? []) as Record<string, unknown>[]).map(publicClientCompany) });
      }

      // ── s) leituras vinculadas à oportunidade ──────────────────────────
      case "list_opportunity_quotes":
      case "list_opportunity_operations": {
        const permission = action === "list_opportunity_quotes" ? "quotes.view" : "operations.view";
        const denied = requirePermission(permission);
        if (denied) return fail(denied);
        const opp = await loadOpportunity(body.opportunityId);
        if (!opp) return fail({ status: 404, error: "Oportunidade não encontrada." });
        const limit = clampLimit(body.limit, 10, 25);

        if (action === "list_opportunity_quotes") {
          const { data } = await client
            .from("quotes")
            .select("id, trip_title, destination, status, start_date, end_date, created_at")
            .eq("user_id", agencyId)
            .eq("opportunity_id", opp.id as string)
            .order("created_at", { ascending: false })
            .limit(limit);
          return json({
            quotes: ((data ?? []) as Record<string, unknown>[]).map(publicQuote),
            create_quote_url: createQuoteDeepLink(opp.id as string),
          });
        }

        const { data } = await client
          .from("operations")
          .select("id, title, destination, travel_start_date, travel_end_date, passengers_count, stage")
          .eq("user_id", agencyId)
          .eq("opportunity_id", opp.id as string)
          .order("travel_start_date", { ascending: false })
          .limit(limit);
        return json({ operations: ((data ?? []) as Record<string, unknown>[]).map(publicOperation) });
      }
    }

    return fail({ status: 400, error: "Ação não reconhecida." });
  } catch (err) {
    console.error("browser-extension-api fatal:", err instanceof Error ? err.message : err);
    return fail({ status: 500, error: "Falha temporária. Tente novamente em alguns instantes." });
  }
});
