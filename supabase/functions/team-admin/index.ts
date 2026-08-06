import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'
import {
  assertAgencyExists, assertNoOwnershipTransfer, assertNotAgencyOwner, assertPlatformAdmin,
  assertTargetAgencyId, buildAuditEntry,
} from '../_shared/agencyTeamGuards.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*, authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function syntheticEmail(login: string, ownerId: string) {
  const safe = String(login).toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${safe}.${ownerId.slice(0, 8)}@team.agentesdesonhos.local`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const str = (v: unknown, max = 180): string | null => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  if (!s) return null
  return s.slice(0, max)
}

const SCOPE_VALUES = ['own', 'created', 'assigned', 'team', 'department', 'agency']

let catalogCache: Set<string> | null = null

/** Catálogo canônico de permissões (public.team_permission_catalog). */
async function permissionCatalog(admin: any): Promise<Set<string>> {
  if (catalogCache) return catalogCache
  const { data } = await admin.from('team_permission_catalog').select('permission_key')
  catalogCache = new Set<string>((data ?? []).map((r: any) => r.permission_key))
  return catalogCache
}

/**
 * Normaliza chaves de permissão contra o catálogo canônico do banco.
 * Quando o solicitante é um administrador colaborador, ele não pode conceder
 * permissões que ele mesmo não possui.
 */
async function validPermissionKeys(
  admin: any, requested: unknown, allowedByCaller: Set<string> | null,
): Promise<string[]> {
  if (!Array.isArray(requested)) return []
  const catalog = await permissionCatalog(admin)
  const out = new Set<string>()
  for (const k of requested) {
    const key = String(k)
    if (!catalog.has(key)) continue
    if (allowedByCaller && !allowedByCaller.has(key)) continue
    out.add(key)
  }
  return Array.from(out)
}

function moduleOf(key: string): string {
  const head = key.split('.')[0]
  const map: Record<string, string> = {
    dashboard: 'dashboard', clients: 'clients', opportunities: 'opportunities',
    operations: 'operations', sales: 'sales', quotes: 'quotes', itineraries: 'itineraries',
    wallet: 'wallet', agenda: 'agenda', tasks: 'agenda', trips: 'agenda',
    financial: 'financial', marketing: 'marketing', academy: 'education',
    courses: 'education', mentorships: 'education', community: 'community',
    chat: 'community', online_users: 'community', directory: 'tools', advisor: 'tools',
    hotel_xray: 'tools', travel_requirements: 'tools', benefits: 'tools', ai: 'tools',
    notes: 'tools', calculator: 'tools', gamification: 'tools', support: 'tools',
    settings: 'settings', account: 'settings', subscription: 'settings',
    integrations: 'settings', team: 'settings', audit: 'settings',
  }
  return map[head] ?? head
}

async function writePermissions(admin: any, ownerId: string, memberId: string, keys: string[]) {
  await admin.from('agency_team_permissions').delete().eq('team_member_id', memberId)
  if (!keys.length) return
  await admin.from('agency_team_permissions').insert(keys.map(k => ({
    agency_id: ownerId, team_member_id: memberId,
    module_key: moduleOf(k), permission_key: k, enabled: true,
  })))
}

async function writeScopes(admin: any, ownerId: string, memberId: string, scopes: unknown) {
  if (!scopes || typeof scopes !== 'object') return
  const rows = Object.entries(scopes as Record<string, string>)
    .filter(([, v]) => SCOPE_VALUES.includes(String(v)))
    .map(([module_key, scope]) => ({
      agency_id: ownerId, team_member_id: memberId,
      module_key: module_key.slice(0, 60), scope,
    }))
  await admin.from('agency_team_scopes').delete().eq('team_member_id', memberId)
  if (rows.length) await admin.from('agency_team_scopes').insert(rows)
}

async function writeStagePermissions(admin: any, ownerId: string, memberId: string, list: unknown) {
  if (!Array.isArray(list)) return
  await admin.from('agency_team_stage_permissions').delete().eq('team_member_id', memberId)
  const rows = list
    .filter((s: any) => s && (s.pipeline_type === 'opportunities' || s.pipeline_type === 'operations') && s.stage_id)
    .map((s: any) => ({
      agency_id: ownerId, team_member_id: memberId,
      pipeline_type: s.pipeline_type, stage_id: s.stage_id,
      can_view: !!s.can_view, can_edit: !!s.can_edit, can_move: !!s.can_move,
    }))
  if (rows.length) await admin.from('agency_team_stage_permissions').insert(rows)
}

/** Perfil de acesso precisa ser nativo ou pertencer à própria agência. */
async function resolveProfileId(admin: any, ownerId: string, id: unknown): Promise<string | null> {
  if (!id) return null
  const { data } = await admin.from('agency_access_profiles')
    .select('id, agency_id, key').eq('id', id).maybeSingle()
  if (!data) return null
  if (data.key === 'owner') return null
  if (data.agency_id && data.agency_id !== ownerId) return null
  return data.id
}

/** Vagas: colaboradores ativos/bloqueados + convites pendentes (reservam vaga). */
async function seatsAvailable(admin: any, ownerId: string): Promise<{ ok: boolean; allowed: number; used: number }> {
  const { data: allowed } = await admin.rpc('team_max_members', { _agency_id: ownerId })
  const max = Number(allowed ?? 3)
  const { data: taken } = await admin.rpc('team_seats_taken', { _agency_id: ownerId })
  const used = Number(taken ?? 0)
  return { ok: used < max, allowed: max, used }
}

const INVITE_FROM = 'Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>'

/** Envia o convite por e-mail quando a infraestrutura estiver configurada. */
async function sendInviteEmail(opts: {
  to: string; name: string | null; agencyName: string; url: string; expiresAt: string
}): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return false
  const validade = new Date(opts.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="font-size:20px;margin:0 0 12px">Você foi convidado para a equipe de ${opts.agencyName}</h2>
      <p style="font-size:14px;line-height:1.6">Olá${opts.name ? ` ${opts.name}` : ''}, use o link abaixo para criar o seu acesso.
      Você mesmo definirá a sua senha — nenhuma senha é enviada por e-mail.</p>
      <p style="margin:24px 0"><a href="${opts.url}"
        style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
        Criar meu acesso</a></p>
      <p style="font-size:12px;color:#666">Este convite é válido até ${validade}. Se você não esperava este convite, ignore esta mensagem.</p>
    </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: INVITE_FROM, to: [opts.to],
        subject: `Convite para a equipe de ${opts.agencyName}`,
        html,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('invite email error', e)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims } = await userClient.auth.getClaims(token)
    if (!claims?.claims?.sub) return json({ error: 'Não autenticado' }, 401)
    const callerId = claims.claims.sub as string

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Proprietário OU colaborador administrador com a permissão team.manage.
    const { data: callerMember } = await admin.from('agency_team_members')
      .select('id, agency_id, status').eq('auth_user_id', callerId).maybeSingle()

    let ownerId = callerId
    /** Chaves que o solicitante pode delegar (null = proprietário, sem limite). */
    let allowedByCaller: Set<string> | null = null

    if (callerMember) {
      if (callerMember.status !== 'active') return json({ error: 'Acesso negado' }, 403)
      const { data: mine } = await admin.from('agency_team_permissions')
        .select('permission_key').eq('team_member_id', callerMember.id).eq('enabled', true)
      const keys = new Set<string>((mine ?? []).map((r: any) => r.permission_key))
      if (!keys.has('team.manage')) {
        return json({ error: 'Você não possui permissão para gerenciar a equipe.' }, 403)
      }
      ownerId = callerMember.agency_id
      allowedByCaller = keys
    }

    const rawBody = await req.json()

    /**
     * Administração global: o administrador da plataforma pode operar a equipe de
     * qualquer agência informando `target_agency_id`, sem impersonar o proprietário.
     * Todas as validações abaixo continuam idênticas, apenas com outro `ownerId`.
     */
    let isPlatformAdmin = false
    if (rawBody?.target_agency_id !== undefined) {
      const badId = assertTargetAgencyId(rawBody.target_agency_id)
      if (badId) return json({ error: badId.error }, badId.status)
      const { data: isAdminRole } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })
      const notAdmin = assertPlatformAdmin(!!isAdminRole)
      if (notAdmin) return json({ error: notAdmin.error }, notAdmin.status)

      const targetId = String(rawBody.target_agency_id)
      const { data: targetProfile } = await admin.from('profiles')
        .select('user_id').eq('user_id', targetId).maybeSingle()
      const { count: subuserCount } = await admin.from('agency_team_members')
        .select('id', { count: 'exact', head: true }).eq('auth_user_id', targetId)
      const badAgency = assertAgencyExists(targetProfile as any, (subuserCount ?? 0) > 0)
      if (badAgency) return json({ error: badAgency.error }, badAgency.status)

      const ownership = assertNoOwnershipTransfer(rawBody)
      if (ownership) return json({ error: ownership.error }, ownership.status)

      isPlatformAdmin = true
      ownerId = targetId
      allowedByCaller = null
    }

    const { data: agencyProfile } = await admin.from('profiles')
      .select('agency_name, name').eq('user_id', ownerId).maybeSingle()
    const agencyName = agencyProfile?.agency_name || agencyProfile?.name || 'sua agência'

    /** Registro padronizado de auditoria (marca o administrador global). */
    const audit = (input: {
      action: string; entityType?: string; entityId?: string | null
      teamMemberId?: string | null; subject?: string | null; details?: Record<string, unknown>
    }) => admin.from('agency_team_audit_log').insert(buildAuditEntry({
      agencyId: ownerId, actorUserId: callerId, isPlatformAdmin,
      action: input.action, entityType: input.entityType, entityId: input.entityId ?? null,
      teamMemberId: input.teamMemberId ?? null, agencyName, subject: input.subject ?? null,
      details: input.details,
    }))

    /** Bloqueia ações sobre o proprietário e sobre outros administradores de equipe. */
    const assertTargetAllowed = async (memberId: string): Promise<string | null> => {
      const ownerGuard = assertNotAgencyOwner(memberId, ownerId)
      if (ownerGuard) return ownerGuard.error
      if (!allowedByCaller) return null
      if (memberId === callerMember?.id) return 'Você não pode alterar o seu próprio acesso.'
      const { data: perms } = await admin.from('agency_team_permissions')
        .select('permission_key').eq('team_member_id', memberId).eq('enabled', true)
      if ((perms ?? []).some((p: any) => p.permission_key === 'team.manage')) {
        return 'Apenas o proprietário pode alterar outro administrador de equipe.'
      }
      return null
    }

    const body = rawBody
    const { action } = body

    // ── Criação direta de colaborador ─────────────────────────
    if (action === 'create') {
      const full_name = str(body.full_name, 120)
      const login = str(body.login, 80)
      const password = String(body.password ?? '')
      if (!full_name || !login || password.length < 6) {
        return json({ error: 'Dados inválidos. A senha precisa ter ao menos 6 caracteres.' }, 400)
      }
      const notification_email = str(body.notification_email, 180)
      const contact_email = str(body.email, 180)
      if (notification_email && !EMAIL_RE.test(notification_email)) {
        return json({ error: 'Informe um e-mail de notificação válido.' }, 400)
      }
      if (contact_email && !EMAIL_RE.test(contact_email)) {
        return json({ error: 'Informe um e-mail de contato válido.' }, 400)
      }

      const seats = await seatsAvailable(admin, ownerId)
      if (!seats.ok) return json({ error: `Limite de ${seats.allowed} acesso(s) do seu plano atingido.` }, 400)

      const { data: existing } = await admin.from('agency_team_members')
        .select('id').eq('login_normalized', login.toLowerCase()).maybeSingle()
      if (existing) return json({ error: 'Este login já está em uso' }, 400)

      const email = syntheticEmail(login, ownerId)
      const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name: full_name, is_team_member: true, agency_id: ownerId, team_login: login },
      })
      if (authErr || !authCreated?.user) {
        return json({ error: `Erro ao criar usuário: ${authErr?.message ?? 'desconhecido'}` }, 400)
      }
      const authUserId = authCreated.user.id

      const password_hash = await bcrypt.hash(password, 10)
      const { data: created, error } = await admin.from('agency_team_members').insert({
        agency_id: ownerId, full_name, login, status: 'active',
        role_title: str(body.role_title, 120),
        email: contact_email,
        phone: str(body.phone, 40),
        department: str(body.department, 120),
        team_name: str(body.team_name, 120),
        access_profile_id: await resolveProfileId(admin, ownerId, body.access_profile_id),
        notification_email: notification_email?.toLowerCase() ?? null,
        auth_user_id: authUserId, synthetic_email: email,
        activated_at: new Date().toISOString(), created_by: ownerId,
      }).select('id').single()
      if (error) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => {})
        return json({ error: error.message }, 400)
      }

      const { error: secretErr } = await admin.from('agency_team_member_secrets').insert({
        member_id: created.id, password_hash,
      })
      if (secretErr) {
        await admin.from('agency_team_members').delete().eq('id', created.id)
        await admin.auth.admin.deleteUser(authUserId).catch(() => {})
        return json({ error: secretErr.message }, 400)
      }

      const keys = body.permission_keys
        ? await validPermissionKeys(admin, body.permission_keys, allowedByCaller)
        : await validPermissionKeys(admin, (body.permissions ?? []).map((p: any) => p.permission_key), allowedByCaller)
      await writePermissions(admin, ownerId, created.id, keys)
      await writeScopes(admin, ownerId, created.id, body.scopes)
      await writeStagePermissions(admin, ownerId, created.id, body.stage_permissions)

      await audit({
        action: 'create_member', entityType: 'team_member', entityId: created.id,
        teamMemberId: created.id, subject: full_name, details: { login, permissions: keys.length },
      })
      return json({ id: created.id })
    }

    // ── Atualização ───────────────────────────────────────────
    if (action === 'update') {
      const { id } = body
      { const g = assertNotAgencyOwner(String(id ?? ''), ownerId); if (g) return json({ error: g.error }, g.status) }
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id, full_name').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      { const deny = await assertTargetAllowed(id); if (deny) return json({ error: deny }, 403) }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.full_name !== undefined) patch.full_name = str(body.full_name, 120)
      if (body.role_title !== undefined) patch.role_title = str(body.role_title, 120)
      if (body.phone !== undefined) patch.phone = str(body.phone, 40)
      if (body.department !== undefined) patch.department = str(body.department, 120)
      if (body.team_name !== undefined) patch.team_name = str(body.team_name, 120)
      if (body.access_profile_id !== undefined) {
        patch.access_profile_id = await resolveProfileId(admin, ownerId, body.access_profile_id)
      }
      if (body.email !== undefined) {
        const v = str(body.email, 180)
        if (v && !EMAIL_RE.test(v)) return json({ error: 'Informe um e-mail de contato válido.' }, 400)
        patch.email = v?.toLowerCase() ?? null
      }
      if (body.notification_email !== undefined) {
        const v = str(body.notification_email, 180)
        if (v && !EMAIL_RE.test(v)) return json({ error: 'Informe um e-mail de notificação válido.' }, 400)
        patch.notification_email = v?.toLowerCase() ?? null
      }
      const { error: upErr } = await admin.from('agency_team_members').update(patch).eq('id', id)
      if (upErr) return json({ error: upErr.message }, 400)

      const password = String(body.password ?? '')
      if (password && password.length >= 6) {
        const newHash = await bcrypt.hash(password, 10)
        await admin.from('agency_team_member_secrets').upsert({
          member_id: id, password_hash: newHash, updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' })
        if (member.auth_user_id) {
          await admin.auth.admin.updateUserById(member.auth_user_id, { password }).catch(() => {})
        }
      } else if (password) {
        return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400)
      }

      if (body.permission_keys !== undefined || body.permissions !== undefined) {
        const keys = body.permission_keys
          ? await validPermissionKeys(admin, body.permission_keys, allowedByCaller)
          : await validPermissionKeys(admin, (body.permissions ?? []).map((p: any) => p.permission_key), allowedByCaller)
        await writePermissions(admin, ownerId, id, keys)
      }
      if (body.scopes !== undefined) await writeScopes(admin, ownerId, id, body.scopes)
      if (body.stage_permissions !== undefined) await writeStagePermissions(admin, ownerId, id, body.stage_permissions)

      // Invalida sessões dedicadas para refletir mudanças imediatamente
      await admin.from('agency_team_sessions').delete().eq('team_member_id', id)

      await audit({
        action: 'update_member', entityType: 'team_member', entityId: id,
        teamMemberId: id, subject: (member as any).full_name,
      })
      return json({ ok: true })
    }

    // ── Status ────────────────────────────────────────────────
    if (action === 'set_status') {
      const { id, status } = body
      if (!['active', 'blocked', 'disabled'].includes(status)) return json({ error: 'Status inválido' }, 400)
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id, full_name').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      { const deny = await assertTargetAllowed(id); if (deny) return json({ error: deny }, 403) }

      const patch: Record<string, unknown> = { status }
      if (status !== 'active') patch.deactivated_at = new Date().toISOString()
      else patch.deactivated_at = null
      const { error } = await admin.from('agency_team_members').update(patch).eq('id', id)
      if (error) return json({ error: error.message }, 400)

      if (status === 'active') {
        if (member.auth_user_id) {
          await admin.auth.admin.updateUserById(member.auth_user_id, { ban_duration: 'none' }).catch(() => {})
        }
      } else {
        await admin.from('agency_team_sessions').delete().eq('team_member_id', id)
        if (member.auth_user_id) {
          await admin.auth.admin.updateUserById(member.auth_user_id, { ban_duration: '876000h' }).catch(() => {})
        }
      }
      await audit({
        action: `set_status_${status}`, entityType: 'team_member', entityId: id,
        teamMemberId: id, subject: (member as any).full_name,
      })
      return json({ ok: true })
    }

    // ── Exclusão ──────────────────────────────────────────────
    if (action === 'delete') {
      const { id } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id, full_name').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      { const deny = await assertTargetAllowed(id); if (deny) return json({ error: deny }, 403) }
      await admin.from('agency_team_members').delete().eq('id', id)
      if (member.auth_user_id) {
        await admin.auth.admin.deleteUser(member.auth_user_id).catch(() => {})
      }
      await audit({
        action: 'delete_member', entityType: 'team_member', entityId: id,
        subject: (member as any).full_name,
      })
      return json({ ok: true })
    }

    // ── Convites ──────────────────────────────────────────────
    if (action === 'invite_create') {
      const email = str(body.email, 180)?.toLowerCase()
      if (!email || !EMAIL_RE.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)

      const seats = await seatsAvailable(admin, ownerId)
      if (!seats.ok) return json({ error: `Limite de ${seats.allowed} acesso(s) do seu plano atingido.` }, 400)

      const profileId = await resolveProfileId(admin, ownerId, body.access_profile_id)
      if (!profileId) return json({ error: 'Selecione um perfil de acesso válido.' }, 400)
      const { data: profile } = await admin.from('agency_access_profiles')
        .select('permission_keys, scopes').eq('id', profileId).maybeSingle()

      const inviteToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const token_hash = await sha256(inviteToken)

      const { error } = await admin.from('agency_team_invites').insert({
        agency_id: ownerId, email,
        full_name: str(body.full_name, 120),
        role_title: str(body.role_title, 120),
        department: str(body.department, 120),
        team_name: str(body.team_name, 120),
        access_profile_id: profileId,
        permission_keys: profile?.permission_keys ?? [],
        scopes: profile?.scopes ?? {},
        token_hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by: ownerId,
      })
      if (error) {
        if (error.code === '23505' || error.message.includes('uq_team_invite_open')) {
          return json({ error: 'Já existe um convite em aberto para este e-mail.' }, 400)
        }
        return json({ error: error.message }, 400)
      }

      await audit({ action: 'invite_created', entityType: 'team_invite', subject: email, details: { email } })
      const origin = str(body.origin, 200) ?? 'https://app.agentesdesonhos.com.br'
      const inviteUrl = `${origin}/convite/${inviteToken}`
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const emailed = await sendInviteEmail({
        to: email, name: str(body.full_name, 120), agencyName, url: inviteUrl, expiresAt,
      })
      if (emailed) {
        await admin.from('agency_team_invites')
          .update({ last_sent_at: new Date().toISOString() }).eq('token_hash', token_hash)
      }
      return json({ ok: true, invite_url: inviteUrl, emailed })
    }

    if (action === 'invite_revoke' || action === 'invite_resend') {
      const { id } = body
      const { data: invite } = await admin.from('agency_team_invites')
        .select('id, agency_id, email, accepted_at').eq('id', id).maybeSingle()
      if (!invite || invite.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      if (invite.accepted_at) return json({ error: 'Este convite já foi aceito.' }, 400)

      if (action === 'invite_revoke') {
        await admin.from('agency_team_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
        await audit({
          action: 'invite_revoked', entityType: 'team_invite', entityId: id,
          subject: invite.email, details: { email: invite.email },
        })
        return json({ ok: true })
      }

      const inviteToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const token_hash = await sha256(inviteToken)
      const { data: current } = await admin.from('agency_team_invites')
        .select('sent_count').eq('id', id).maybeSingle()
      await admin.from('agency_team_invites').update({
        token_hash,
        revoked_at: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        sent_count: (current?.sent_count ?? 1) + 1,
        last_sent_at: new Date().toISOString(),
      }).eq('id', id)
      await audit({
        action: 'invite_resent', entityType: 'team_invite', entityId: id,
        subject: invite.email, details: { email: invite.email },
      })
      const origin = str(body.origin, 200) ?? 'https://app.agentesdesonhos.com.br'
      const resendUrl = `${origin}/convite/${inviteToken}`
      const emailed = await sendInviteEmail({
        to: invite.email, name: null, agencyName, url: resendUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      return json({ ok: true, invite_url: resendUrl, emailed })
    }

    // ── Perfis de acesso personalizados ───────────────────────
    if (action?.startsWith('profile_')) {
      const loadProfile = async (id: string) => {
        const { data } = await admin.from('agency_access_profiles')
          .select('id, agency_id, key, name, is_native, permission_keys, scopes').eq('id', id).maybeSingle()
        return data
      }

      if (action === 'profile_create' || action === 'profile_duplicate') {
        const name = str(body.name, 120)
        if (!name) return json({ error: 'Informe o nome do perfil.' }, 400)
        let keys: string[] = []
        let scopes: Record<string, string> = {}
        if (action === 'profile_duplicate') {
          const src = await loadProfile(String(body.source_id ?? ''))
          if (!src) return json({ error: 'Perfil de origem não encontrado.' }, 404)
          if (src.agency_id && src.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
          keys = await validPermissionKeys(admin, src.permission_keys ?? [], allowedByCaller)
          scopes = (src.scopes ?? {}) as Record<string, string>
        } else {
          keys = await validPermissionKeys(admin, body.permission_keys ?? [], allowedByCaller)
          scopes = (body.scopes ?? {}) as Record<string, string>
        }
        const { data: created, error } = await admin.from('agency_access_profiles').insert({
          agency_id: ownerId, key: `custom_${crypto.randomUUID().slice(0, 8)}`,
          name, description: str(body.description, 240),
          is_native: false, permission_keys: keys, scopes,
        }).select('id').single()
        if (error) return json({ error: error.message }, 400)
        await audit({
          action: 'access_profile_created', entityType: 'access_profile', entityId: created.id,
          subject: name, details: { name },
        })
        return json({ ok: true, id: created.id })
      }

      const target = await loadProfile(String(body.id ?? ''))
      if (!target) return json({ error: 'Perfil não encontrado.' }, 404)
      if (target.is_native || !target.agency_id) {
        return json({ error: 'Perfis nativos não podem ser alterados ou excluídos.' }, 400)
      }
      if (target.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

      if (action === 'profile_update') {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) {
          const name = str(body.name, 120)
          if (!name) return json({ error: 'Informe o nome do perfil.' }, 400)
          patch.name = name
        }
        if (body.description !== undefined) patch.description = str(body.description, 240)
        if (body.permission_keys !== undefined) {
          patch.permission_keys = await validPermissionKeys(admin, body.permission_keys, allowedByCaller)
        }
        if (body.scopes !== undefined && body.scopes && typeof body.scopes === 'object') {
          patch.scopes = Object.fromEntries(
            Object.entries(body.scopes as Record<string, string>)
              .filter(([, v]) => SCOPE_VALUES.includes(String(v)))
          )
        }
        const { error } = await admin.from('agency_access_profiles').update(patch).eq('id', target.id)
        if (error) return json({ error: error.message }, 400)
        await audit({
          action: 'access_profile_updated', entityType: 'access_profile', entityId: target.id,
          subject: target.name,
        })
        return json({ ok: true })
      }

      if (action === 'profile_delete') {
        const { count } = await admin.from('agency_team_members')
          .select('id', { count: 'exact', head: true }).eq('access_profile_id', target.id)
        const migrateTo = body.migrate_to_profile_id
          ? await resolveProfileId(admin, ownerId, body.migrate_to_profile_id) : null
        if ((count ?? 0) > 0) {
          if (!migrateTo) {
            return json({
              error: `Este perfil está em uso por ${count} colaborador(es). Escolha um perfil para migrar antes de excluir.`,
              in_use: count,
            }, 400)
          }
          await admin.from('agency_team_members')
            .update({ access_profile_id: migrateTo }).eq('access_profile_id', target.id)
        }
        const { error } = await admin.from('agency_access_profiles').delete().eq('id', target.id)
        if (error) return json({ error: error.message }, 400)
        await audit({
          action: 'access_profile_deleted', entityType: 'access_profile', entityId: target.id,
          subject: target.name, details: { migrated_to: migrateTo, members: count ?? 0 },
        })
        return json({ ok: true })
      }

      return json({ error: 'Ação desconhecida' }, 400)
    }

    return json({ error: 'Ação desconhecida' }, 400)
  } catch (e) {
    console.error('team-admin error', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
