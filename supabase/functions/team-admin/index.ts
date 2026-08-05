import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

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

/** Normaliza chaves de permissão contra o catálogo persistido nos perfis nativos. */
async function validPermissionKeys(admin: any, requested: unknown): Promise<string[]> {
  if (!Array.isArray(requested)) return []
  const { data } = await admin.from('agency_access_profiles')
    .select('permission_keys').is('agency_id', null).eq('key', 'admin').maybeSingle()
  const catalog = new Set<string>((data?.permission_keys ?? []) as string[])
  const out = new Set<string>()
  for (const k of requested) {
    const key = String(k)
    if (catalog.has(key)) out.add(key)
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

async function seatsAvailable(admin: any, ownerId: string): Promise<{ ok: boolean; allowed: number }> {
  const { data: allowed } = await admin.rpc('team_max_members', { _agency_id: ownerId })
  const max = Number(allowed ?? 3)
  const { count } = await admin.from('agency_team_members')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', ownerId).in('status', ['active', 'blocked'])
  return { ok: (count ?? 0) < max, allowed: max }
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

    // Somente o proprietário da agência administra a equipe.
    const { data: callerMember } = await admin.from('agency_team_members')
      .select('id').eq('auth_user_id', callerId).maybeSingle()
    if (callerMember) return json({ error: 'Apenas o proprietário da agência pode gerenciar a equipe.' }, 403)
    const ownerId = callerId

    const body = await req.json()
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
        ? await validPermissionKeys(admin, body.permission_keys)
        : await validPermissionKeys(admin, (body.permissions ?? []).map((p: any) => p.permission_key))
      await writePermissions(admin, ownerId, created.id, keys)
      await writeScopes(admin, ownerId, created.id, body.scopes)
      await writeStagePermissions(admin, ownerId, created.id, body.stage_permissions)

      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: created.id, actor_user_id: ownerId,
        action: 'create_member', module_key: 'team', entity_type: 'team_member', entity_id: created.id,
        details: { login, permissions: keys.length },
      })
      return json({ id: created.id })
    }

    // ── Atualização ───────────────────────────────────────────
    if (action === 'update') {
      const { id } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

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
          ? await validPermissionKeys(admin, body.permission_keys)
          : await validPermissionKeys(admin, (body.permissions ?? []).map((p: any) => p.permission_key))
        await writePermissions(admin, ownerId, id, keys)
      }
      if (body.scopes !== undefined) await writeScopes(admin, ownerId, id, body.scopes)
      if (body.stage_permissions !== undefined) await writeStagePermissions(admin, ownerId, id, body.stage_permissions)

      // Invalida sessões dedicadas para refletir mudanças imediatamente
      await admin.from('agency_team_sessions').delete().eq('team_member_id', id)

      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: id, actor_user_id: ownerId,
        action: 'update_member', module_key: 'team', entity_type: 'team_member', entity_id: id,
      })
      return json({ ok: true })
    }

    // ── Status ────────────────────────────────────────────────
    if (action === 'set_status') {
      const { id, status } = body
      if (!['active', 'blocked', 'disabled'].includes(status)) return json({ error: 'Status inválido' }, 400)
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

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
      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: id, actor_user_id: ownerId,
        action: `set_status_${status}`, module_key: 'team', entity_type: 'team_member', entity_id: id,
      })
      return json({ ok: true })
    }

    // ── Exclusão ──────────────────────────────────────────────
    if (action === 'delete') {
      const { id } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      await admin.from('agency_team_members').delete().eq('id', id)
      if (member.auth_user_id) {
        await admin.auth.admin.deleteUser(member.auth_user_id).catch(() => {})
      }
      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: null, actor_user_id: ownerId,
        action: 'delete_member', module_key: 'team', entity_type: 'team_member', entity_id: id,
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

      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, actor_user_id: ownerId, action: 'invite_created',
        module_key: 'team', entity_type: 'team_invite', details: { email },
      })
      const origin = str(body.origin, 200) ?? 'https://app.agentesdesonhos.com.br'
      return json({ ok: true, invite_url: `${origin}/convite/${inviteToken}` })
    }

    if (action === 'invite_revoke' || action === 'invite_resend') {
      const { id } = body
      const { data: invite } = await admin.from('agency_team_invites')
        .select('id, agency_id, email, accepted_at').eq('id', id).maybeSingle()
      if (!invite || invite.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      if (invite.accepted_at) return json({ error: 'Este convite já foi aceito.' }, 400)

      if (action === 'invite_revoke') {
        await admin.from('agency_team_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
        await admin.from('agency_team_audit_log').insert({
          agency_id: ownerId, actor_user_id: ownerId, action: 'invite_revoked',
          module_key: 'team', entity_type: 'team_invite', entity_id: id, details: { email: invite.email },
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
      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, actor_user_id: ownerId, action: 'invite_resent',
        module_key: 'team', entity_type: 'team_invite', entity_id: id, details: { email: invite.email },
      })
      const origin = str(body.origin, 200) ?? 'https://app.agentesdesonhos.com.br'
      return json({ ok: true, invite_url: `${origin}/convite/${inviteToken}` })
    }

    return json({ error: 'Ação desconhecida' }, 400)
  } catch (e) {
    console.error('team-admin error', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
