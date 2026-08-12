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
  budgetSentNote, clampInt, filterVisibleStages,
  isUuid, isUsablePhone, normalizePhone, publicContact, publicOpportunity, safeAmount,
  safeHttpUrl, safeText, teamPermissionFilter, validateDestination, validateIsoDate, validateName,
  type BridgeError,
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
          permissions: Object.fromEntries(PERMISSION_KEYS.map(k => [k, can(k)])),
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
          .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, estimated_value, follow_up_date, created_at, pipeline_stage:pipeline_stages(name, legacy_key)")
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
            stage: (firstStage?.legacy_key as string | null) || "new_contact",
            stage_id: (firstStage?.id as string | null) ?? null,
            ...(isTeamMember ? { created_by_team_member_id: teamMemberId } : {}),
          })
          .select("id, destination, stage, stage_id, start_date, end_date, passengers_count, estimated_value, follow_up_date, created_at")
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
        const followUpDate = validateIsoDate(body.followUpDate);
        if (!followUpDate) return fail({ status: 400, error: "Informe a data do follow-up no formato AAAA-MM-DD." });
        const opp = await loadOpportunity(body.opportunityId);
        if (!opp) return fail({ status: 404, error: "Oportunidade não encontrada." });

        const { data, error } = await client
          .from("opportunity_followups")
          .insert({
            opportunity_id: opp.id as string,
            user_id: agencyId,
            follow_up_date: followUpDate,
            note: safeText(body.note, 1000) || null,
          })
          .select("id, follow_up_date, note, created_at")
          .single();
        if (error) {
          console.error("create_followup:", error.message);
          return fail({ status: 403, error: "Não foi possível registrar o follow-up." });
        }

        await client.from("opportunities")
          .update({ follow_up_date: followUpDate })
          .eq("id", opp.id as string);

        return json({ followup: data }, 201);
      }
    }

    return fail({ status: 400, error: "Ação não reconhecida." });
  } catch (err) {
    console.error("browser-extension-api fatal:", err instanceof Error ? err.message : err);
    return fail({ status: 500, error: "Falha temporária. Tente novamente em alguns instantes." });
  }
});
