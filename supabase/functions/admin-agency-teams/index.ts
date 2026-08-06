import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  assertAgencyExists, assertPlatformAdmin, assertTargetAgencyId, assertTargetInAgency,
  assertRecordId, buildAuditEntry, sanitizeRows, safeText, uuidList, validateLimitOverride,
} from '../_shared/agencyTeamGuards.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*, authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const PAGE_MAX = 50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims } = await userClient.auth.getClaims(token)
    if (!claims?.claims?.sub) return json({ error: 'Não autenticado' }, 401)
    const callerId = claims.claims.sub as string

    // Service role existe apenas no servidor. O navegador nunca recebe esta chave.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: isAdminRole } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })
    const notAdmin = assertPlatformAdmin(!!isAdminRole)
    if (notAdmin) return json({ error: notAdmin.error }, notAdmin.status)

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action ?? '')

    const emailCache = new Map<string, string | null>()
    const ownerEmail = async (id: string): Promise<string | null> => {
      if (emailCache.has(id)) return emailCache.get(id) ?? null
      const { data } = await admin.auth.admin.getUserById(id).catch(() => ({ data: null } as any))
      const email = (data as any)?.user?.email ?? null
      emailCache.set(id, email)
      return email
    }

    // ── KPIs gerais ───────────────────────────────────────────
    if (action === 'stats') {
      const [members, invites, profiles, ownersTotal] = await Promise.all([
        admin.from('agency_team_members').select('agency_id, status'),
        admin.from('agency_team_invites').select('agency_id, accepted_at, revoked_at, expires_at'),
        admin.from('agency_access_profiles').select('id, agency_id, is_native'),
        // Mesmo universo de proprietários/agências de admin_agency_teams_list:
        // perfis com user_id não nulo que não são colaboradores de equipe.
        admin.rpc('admin_agency_owners_total'),
      ])
      const rows = members.data ?? []
      const openInvites = (invites.data ?? []).filter((i: any) =>
        !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date())
      const agencies = new Set<string>(rows.map((r: any) => r.agency_id))
      openInvites.forEach((i: any) => agencies.add(i.agency_id))
      return json({
        agencies_total: Number(ownersTotal.data ?? 0),
        agencies_with_team: agencies.size,
        active_members: rows.filter((r: any) => r.status === 'active').length,
        inactive_members: rows.filter((r: any) => r.status === 'blocked' || r.status === 'disabled').length,
        pending_invites: openInvites.length,
        custom_profiles: (profiles.data ?? []).filter((p: any) => !p.is_native && p.agency_id).length,
      })
    }

    // ── Lista global de agências (todas, com ou sem equipe) ───
    if (action === 'agencies') {
      const search = safeText(body.search, 120) ?? null
      const planFilter = safeText(body.plan, 40)
      const teamFilter = safeText(body.team, 20) ?? 'all'   // all | with | without
      const atLimitOnly = body.at_limit === true
      const pendingOnly = body.pending_invites === true
      const page = Math.max(1, Number(body.page ?? 1) || 1)
      const pageSize = Math.min(PAGE_MAX, Math.max(5, Number(body.page_size ?? 20) || 20))
      const term = search?.trim().toLowerCase() ?? ''

      // 1) Todos os perfis proprietários (o UID da agência é profiles.user_id).
      //    Perfis paginados em lote — nunca uma consulta por linha.
      const profiles: any[] = []
      const PROFILE_BATCH = 1000
      for (let from = 0; from < 20_000; from += PROFILE_BATCH) {
        const { data, error } = await admin.from('profiles')
          .select('user_id, name, agency_name')
          .not('user_id', 'is', null)
          .order('user_id')
          .range(from, from + PROFILE_BATCH - 1)
        if (error) {
          console.error('profiles batch error', error)
          return json({ error: 'Não foi possível carregar as agências.' }, 400)
        }
        profiles.push(...(data ?? []))
        if ((data ?? []).length < PROFILE_BATCH) break
      }

      // 2) Colaboradores nunca são agências.
      const { data: subusers } = await admin.from('agency_team_members').select('auth_user_id')
      const subuserIds = new Set((subusers ?? []).map((s: any) => s.auth_user_id).filter(Boolean))

      // 3) E-mails em lote via listUsers (nunca uma consulta de usuário por linha).
      const emailById = new Map<string, string>()
      for (let p = 1; p <= 40; p++) {
        const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 1000 })
        if (error) break
        const users = (data?.users ?? []) as any[]
        users.forEach(u => { if (u?.id && u?.email) emailById.set(u.id, String(u.email)) })
        if (users.length < 1000) break
      }

      // 4) Equipe, convites, limites e assinaturas — sempre em lote.
      const [membersRes, invitesRes, overridesRes, planLimitsRes, subsRes] = await Promise.all([
        admin.from('agency_team_members').select('agency_id, status, last_login_at, updated_at'),
        admin.from('agency_team_invites').select('agency_id, accepted_at, revoked_at, expires_at'),
        admin.from('agency_team_limit_overrides').select('agency_id, max_members'),
        admin.from('plan_team_limits').select('plan, max_members'),
        admin.from('subscriptions').select('user_id, plan, is_active, expires_at').eq('is_active', true),
      ])
      const now = Date.now()
      const memberAgg = new Map<string, { active: number; inactive: number; seats: number; last: string | null }>()
      ;(membersRes.data ?? []).forEach((m: any) => {
        const cur = memberAgg.get(m.agency_id) ?? { active: 0, inactive: 0, seats: 0, last: null }
        if (m.status === 'active') cur.active += 1
        if (m.status === 'blocked' || m.status === 'disabled') cur.inactive += 1
        if (m.status === 'active' || m.status === 'blocked') cur.seats += 1
        const stamp = m.last_login_at ?? m.updated_at ?? null
        if (stamp && (!cur.last || stamp > cur.last)) cur.last = stamp
        memberAgg.set(m.agency_id, cur)
      })
      const pendingAgg = new Map<string, number>()
      ;(invitesRes.data ?? []).forEach((i: any) => {
        if (i.accepted_at || i.revoked_at || new Date(i.expires_at).getTime() <= now) return
        pendingAgg.set(i.agency_id, (pendingAgg.get(i.agency_id) ?? 0) + 1)
      })
      const overrideById = new Map<string, number>()
      ;(overridesRes.data ?? []).forEach((o: any) => overrideById.set(o.agency_id, o.max_members))
      const planLimit = new Map<string, number>()
      ;(planLimitsRes.data ?? []).forEach((p: any) => planLimit.set(String(p.plan), p.max_members))
      const planById = new Map<string, string>()
      ;(subsRes.data ?? []).forEach((s: any) => {
        if (s.expires_at && new Date(s.expires_at).getTime() <= now) return
        if (!planById.has(s.user_id)) planById.set(s.user_id, String(s.plan))
      })

      // 5) Monta as linhas (inclui agências sem equipe por padrão).
      const all = profiles
        .filter(p => !subuserIds.has(p.user_id))
        .map(p => {
          const id = p.user_id as string
          const agg = memberAgg.get(id) ?? { active: 0, inactive: 0, seats: 0, last: null }
          const pending = pendingAgg.get(id) ?? 0
          const plan = planById.get(id) ?? 'essencial'
          const override = overrideById.get(id) ?? null
          return {
            agency_id: id,
            agency_name: (p.agency_name?.trim() || p.name?.trim() || 'Agência sem nome') as string,
            owner_name: p.name ?? null,
            owner_email: emailById.get(id) ?? null,
            plan,
            active_members: agg.active,
            inactive_members: agg.inactive,
            pending_invites: pending,
            seats_used: agg.seats + pending,
            seats_limit: override ?? planLimit.get(plan) ?? 3,
            limit_override: override,
            last_activity: agg.last,
          }
        })

      // 6) Filtros aplicados ANTES do total e da paginação.
      const filtered = all.filter(r => {
        if (term) {
          const hit = r.agency_name.toLowerCase().includes(term)
            || (r.owner_name ?? '').toLowerCase().includes(term)
            || (r.owner_email ?? '').toLowerCase().includes(term)
            || r.agency_id.toLowerCase() === term
          if (!hit) return false
        }
        if (planFilter && planFilter !== 'all' && r.plan !== planFilter) return false
        const hasTeam = r.active_members + r.inactive_members > 0
        if (teamFilter === 'with' && !hasTeam) return false
        if (teamFilter === 'without' && hasTeam) return false
        if (atLimitOnly && r.seats_used < r.seats_limit) return false
        if (pendingOnly && r.pending_invites < 1) return false
        return true
      })
      filtered.sort((a, b) =>
        (b.active_members + b.pending_invites) - (a.active_members + a.pending_invites)
        || a.agency_name.localeCompare(b.agency_name, 'pt-BR'))

      const start = (page - 1) * pageSize
      return json({
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        page_size: pageSize,
      })
    }

    // ── A partir daqui é obrigatório informar a agência alvo ───
    const badId = assertTargetAgencyId(body.target_agency_id)
    if (badId) return json({ error: badId.error }, badId.status)
    const agencyId = String(body.target_agency_id)

    const { data: agencyProfile } = await admin.from('profiles')
      .select('user_id, name, agency_name, phone, avatar_url').eq('user_id', agencyId).maybeSingle()
    const { count: subuserCount } = await admin.from('agency_team_members')
      .select('id', { count: 'exact', head: true }).eq('auth_user_id', agencyId)
    const badAgency = assertAgencyExists(agencyProfile as any, (subuserCount ?? 0) > 0)
    if (badAgency) return json({ error: badAgency.error }, badAgency.status)

    const agencyName = (agencyProfile as any)?.agency_name || (agencyProfile as any)?.name || 'agência'

    const audit = (input: {
      action: string; entityType?: string; entityId?: string | null
      subject?: string | null; details?: Record<string, unknown>
    }) => admin.from('agency_team_audit_log').insert(buildAuditEntry({
      agencyId, actorUserId: callerId, isPlatformAdmin: true, agencyName,
      action: input.action, entityType: input.entityType, entityId: input.entityId ?? null,
      subject: input.subject ?? null, details: input.details,
    }))

    const quotaOf = async () => {
      const [{ data: max }, { data: taken }] = await Promise.all([
        admin.rpc('team_max_members', { _agency_id: agencyId }),
        admin.rpc('team_seats_taken', { _agency_id: agencyId }),
      ])
      const { data: plan } = await admin.rpc('get_user_plan', { _user_id: agencyId })
      const { data: planLimit } = await admin.from('plan_team_limits')
        .select('max_members').eq('plan', plan as any).maybeSingle()
      const { data: override } = await admin.from('agency_team_limit_overrides')
        .select('max_members, reason, created_by, updated_at').eq('agency_id', agencyId).maybeSingle()
      const { count: pending } = await admin.from('agency_team_invites')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId).is('accepted_at', null).is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
      return {
        used: Number(taken ?? 0),
        total: Number(max ?? 3),
        plan: (plan as any) ?? null,
        plan_limit: (planLimit as any)?.max_members ?? null,
        pending: pending ?? 0,
        override: override ?? null,
      }
    }

    switch (action) {
      case 'agency_detail': {
        const quota = await quotaOf()
        return json({
          agency: {
            agency_id: agencyId,
            agency_name: agencyName,
            owner_name: (agencyProfile as any)?.name ?? null,
            owner_email: await ownerEmail(agencyId),
            avatar_url: (agencyProfile as any)?.avatar_url ?? null,
          },
          quota,
        })
      }

      case 'quota':
        return json(await quotaOf())

      case 'members': {
        const { data } = await admin.from('agency_team_members')
          .select(`id, login, full_name, email, phone, avatar_url, role_title, department, team_name,
                   access_profile_id, status, last_login_at, invited_at, activated_at, created_at,
                   agency_access_profiles ( name, key )`)
          .eq('agency_id', agencyId).order('created_at', { ascending: false })
        const ids = uuidList((data ?? []).map((m: any) => m.id))
        // Lista vazia => nenhuma consulta (sem fallback de UUID falso).
        const [{ data: perms }, { data: stages }] = ids.length
          ? await Promise.all([
            admin.from('agency_team_permissions').select('team_member_id').in('team_member_id', ids).eq('enabled', true),
            admin.from('agency_team_stage_permissions').select('team_member_id').in('team_member_id', ids),
          ])
          : [{ data: [] as any[] }, { data: [] as any[] }]
        const countBy = (rows: any[] | null, id: string) => (rows ?? []).filter(r => r.team_member_id === id).length
        return json(sanitizeRows((data ?? []).map((m: any) => ({
          ...m,
          agency_access_profiles: undefined,
          access_profile_name: m.agency_access_profiles?.name ?? null,
          access_profile_key: m.agency_access_profiles?.key ?? null,
          permissions_count: countBy(perms as any, m.id),
          stage_permissions_count: countBy(stages as any, m.id),
        }))))
      }

      case 'member_detail': {
        const id = String(body.member_id ?? '')
        const badMember = assertRecordId(id)
        if (badMember) return json({ error: badMember.error }, badMember.status)
        const { data: member } = await admin.from('agency_team_members')
          .select('*').eq('id', id).maybeSingle()
        const guard = assertTargetInAgency((member as any)?.agency_id, agencyId)
        if (guard) return json({ error: guard.error }, guard.status)
        const [{ data: perms }, { data: stagePerms }, { data: scopes }] = await Promise.all([
          admin.from('agency_team_permissions').select('module_key, permission_key, enabled').eq('team_member_id', id),
          admin.from('agency_team_stage_permissions')
            .select('pipeline_type, stage_id, can_view, can_edit, can_move').eq('team_member_id', id),
          admin.from('agency_team_scopes').select('module_key, scope').eq('team_member_id', id),
        ])
        const scopeMap: Record<string, string> = {}
        ;(scopes ?? []).forEach((s: any) => { scopeMap[s.module_key] = s.scope })
        return json({
          ...sanitizeRows([member as any])[0],
          permissions: perms ?? [],
          stage_permissions: stagePerms ?? [],
          scopes: scopeMap,
        })
      }

      case 'member_scopes': {
        const id = String(body.member_id ?? '')
        const badScopeMember = assertRecordId(id)
        if (badScopeMember) return json({ error: badScopeMember.error }, badScopeMember.status)
        const { data: member } = await admin.from('agency_team_members')
          .select('id, agency_id').eq('id', id).maybeSingle()
        const guard = assertTargetInAgency((member as any)?.agency_id, agencyId)
        if (guard) return json({ error: guard.error }, guard.status)
        const { data } = await admin.from('agency_team_scopes')
          .select('module_key, scope').eq('team_member_id', id)
        return json(data ?? [])
      }

      case 'stages': {
        const [opps, ops] = await Promise.all([
          admin.from('pipeline_stages').select('id, name, color, position')
            .eq('user_id', agencyId).order('position'),
          admin.from('operation_pipeline_stages').select('id, name, color, position')
            .eq('user_id', agencyId).order('position'),
        ])
        return json({ opportunities: opps.data ?? [], operations: ops.data ?? [] })
      }

      case 'invites': {
        // token_hash nunca é selecionado nem devolvido.
        const { data } = await admin.from('agency_team_invites')
          .select(`id, email, full_name, role_title, department, team_name, access_profile_id,
                   expires_at, accepted_at, revoked_at, sent_count, last_sent_at, created_at,
                   agency_access_profiles ( name )`)
          .eq('agency_id', agencyId).order('created_at', { ascending: false })
        return json(sanitizeRows((data ?? []).map((i: any) => ({
          ...i,
          agency_access_profiles: undefined,
          access_profile_name: i.agency_access_profiles?.name ?? null,
        }))))
      }

      case 'access_profiles': {
        const { data } = await admin.from('agency_access_profiles')
          .select('id, agency_id, key, name, description, is_native, permission_keys, scopes')
          .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
          .order('is_native', { ascending: false }).order('name')
        return json(data ?? [])
      }

      case 'audit': {
        const memberIdRaw = safeText(body.member_id, 40)
        const memberId = memberIdRaw && !assertRecordId(memberIdRaw) ? memberIdRaw : null
        const actionFilter = safeText(body.action_filter, 60)
        const moduleFilter = safeText(body.module_filter, 60)
        const from = safeText(body.from, 40)
        const to = safeText(body.to, 40)
        let q = admin.from('agency_team_audit_log')
          .select(`id, action, module_key, entity_type, entity_id, team_member_id,
                   actor_user_id, actor_is_platform_admin, details, created_at`)
          .eq('agency_id', agencyId)
        if (memberId) q = q.eq('team_member_id', memberId)
        if (actionFilter) q = q.eq('action', actionFilter)
        if (moduleFilter) q = q.eq('module_key', moduleFilter)
        if (from) q = q.gte('created_at', from)
        if (to) q = q.lte('created_at', to)
        const { data } = await q.order('created_at', { ascending: false }).limit(300)
        const ids = uuidList(Array.from(new Set((data ?? []).map((r: any) => r.team_member_id))))
        // Lista vazia => nenhuma consulta (sem fallback de UUID falso).
        const { data: names } = ids.length
          ? await admin.from('agency_team_members').select('id, full_name').in('id', ids)
          : { data: [] as any[] }
        return json(sanitizeRows((data ?? []).map((r: any) => ({
          ...r,
          member_name: (names ?? []).find((n: any) => n.id === r.team_member_id)?.full_name ?? null,
        }))))
      }

      case 'community_get': {
        const { data } = await admin.from('agency_community_settings')
          .select('*').eq('agency_id', agencyId).maybeSingle()
        return json({
          public_community_enabled: (data as any)?.public_community_enabled ?? true,
          internal_community_enabled: (data as any)?.internal_community_enabled ?? true,
          online_users_enabled: (data as any)?.online_users_enabled ?? true,
          internal_chat_enabled: (data as any)?.internal_chat_enabled ?? true,
          external_chat_enabled: (data as any)?.external_chat_enabled ?? true,
          preset: (data as any)?.preset ?? 'full',
        })
      }

      case 'community_save': {
        const preset = safeText(body.preset, 20) ?? 'custom'
        if (!['full', 'agency_only', 'disabled', 'custom'].includes(preset)) {
          return json({ error: 'Modo inválido.' }, 400)
        }
        const row = {
          agency_id: agencyId,
          public_community_enabled: body.public_community_enabled !== false,
          internal_community_enabled: body.internal_community_enabled !== false,
          online_users_enabled: body.online_users_enabled !== false,
          internal_chat_enabled: body.internal_chat_enabled !== false,
          external_chat_enabled: body.external_chat_enabled !== false,
          preset, updated_by: callerId, updated_at: new Date().toISOString(),
        }
        const { error } = await admin.from('agency_community_settings')
          .upsert(row, { onConflict: 'agency_id' })
        if (error) return json({ error: 'Não foi possível salvar as configurações de comunidade.' }, 400)
        await audit({ action: 'community_settings_update', entityType: 'community_settings', details: { preset } })
        return json({ ok: true })
      }

      case 'limit_override_set': {
        const quota = await quotaOf()
        const check = validateLimitOverride({
          max_members: body.max_members, reason: body.reason, seatsUsed: quota.used,
        })
        if (check.error) return json({ error: check.error.error }, check.error.status)
        const { error } = await admin.from('agency_team_limit_overrides').upsert({
          agency_id: agencyId, max_members: check.max_members!, reason: check.reason!,
          created_by: callerId, updated_at: new Date().toISOString(),
        }, { onConflict: 'agency_id' })
        if (error) return json({ error: 'Não foi possível salvar o limite administrativo.' }, 400)
        await audit({
          action: 'team_limit_override_set', entityType: 'team_limit_override', entityId: agencyId,
          details: {
            max_members: check.max_members, reason: check.reason,
            previous_total: quota.total, plan_limit: quota.plan_limit, seats_used: quota.used,
          },
        })
        return json({ ok: true, warning: check.warning ?? null, ...(await quotaOf()) })
      }

      case 'limit_override_clear': {
        const before = await quotaOf()
        const { error } = await admin.from('agency_team_limit_overrides').delete().eq('agency_id', agencyId)
        if (error) return json({ error: 'Não foi possível remover o limite administrativo.' }, 400)
        await audit({
          action: 'team_limit_override_cleared', entityType: 'team_limit_override', entityId: agencyId,
          details: { previous_total: before.total, plan_limit: before.plan_limit },
        })
        return json({ ok: true, ...(await quotaOf()) })
      }
    }

    return json({ error: 'Ação desconhecida' }, 400)
  } catch (e) {
    console.error('admin-agency-teams error', e)
    return json({ error: 'Erro interno ao processar a solicitação.' }, 500)
  }
})