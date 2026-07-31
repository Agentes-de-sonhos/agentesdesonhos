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
    const ownerId = claims.claims.sub as string

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { full_name, login, password, role_title, notification_email, permissions, stage_permissions } = body
      if (!full_name || !login || !password || password.length < 6) {
        return json({ error: 'Dados inválidos. Senha precisa ter ao menos 6 caracteres.' }, 400)
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (notification_email && !emailRe.test(String(notification_email).trim())) {
        return json({ error: 'Informe um e-mail de notificação válido.' }, 400)
      }
      // Verifica limite
      const { count } = await admin.from('agency_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', ownerId).eq('status', 'active')
      if ((count ?? 0) >= 3) return json({ error: 'Limite de 3 usuários atingido' }, 400)

      // Login único global
      const { data: existing } = await admin.from('agency_team_members')
        .select('id').eq('login_normalized', String(login).toLowerCase().trim()).maybeSingle()
      if (existing) return json({ error: 'Este login já está em uso' }, 400)

      // Cria usuário no Supabase Auth
      const email = syntheticEmail(login, ownerId)
      const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: full_name,
          is_team_member: true,
          agency_id: ownerId,
          team_login: login.trim(),
        },
      })
      if (authErr || !authCreated?.user) {
        return json({ error: `Erro ao criar usuário: ${authErr?.message ?? 'desconhecido'}` }, 400)
      }
      const authUserId = authCreated.user.id

      const password_hash = await bcrypt.hash(password, 10)
      const { data: created, error } = await admin.from('agency_team_members').insert({
        agency_id: ownerId, full_name, login: login.trim(),
        role_title: role_title ?? null, status: 'active',
        notification_email: notification_email ? String(notification_email).trim().toLowerCase() : null,
        auth_user_id: authUserId, synthetic_email: email,
      }).select('id').single()
      if (error) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => {})
        return json({ error: error.message }, 400)
      }

      // Guarda o hash da senha em tabela isolada (sem acesso PostgREST)
      const { error: secretErr } = await admin.from('agency_team_member_secrets').insert({
        member_id: created.id, password_hash,
      })
      if (secretErr) {
        await admin.from('agency_team_members').delete().eq('id', created.id)
        await admin.auth.admin.deleteUser(authUserId).catch(() => {})
        return json({ error: secretErr.message }, 400)
      }

      // Permissões iniciais
      if (Array.isArray(permissions) && permissions.length > 0) {
        await admin.from('agency_team_permissions').insert(
          permissions.filter((p: any) => p.enabled).map((p: any) => ({
            agency_id: ownerId, team_member_id: created.id,
            module_key: p.module_key, permission_key: p.permission_key, enabled: true,
          }))
        )
      }
      if (Array.isArray(stage_permissions) && stage_permissions.length > 0) {
        await admin.from('agency_team_stage_permissions').insert(
          stage_permissions.map((s: any) => ({
            agency_id: ownerId, team_member_id: created.id,
            pipeline_type: s.pipeline_type, stage_id: s.stage_id,
            can_view: !!s.can_view, can_edit: !!s.can_edit, can_move: !!s.can_move,
          }))
        )
      }

      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: created.id, action: 'create_member',
        details: { login },
      })
      return json({ id: created.id })
    }

    if (action === 'update') {
      const { id, full_name, role_title, notification_email, password, permissions, stage_permissions } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

      const patch: any = { updated_at: new Date().toISOString() }
      if (full_name !== undefined) patch.full_name = full_name
      if (role_title !== undefined) patch.role_title = role_title
      if (notification_email !== undefined) {
        const trimmed = notification_email ? String(notification_email).trim().toLowerCase() : null
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return json({ error: 'Informe um e-mail de notificação válido.' }, 400)
        }
        patch.notification_email = trimmed
      }
      await admin.from('agency_team_members').update(patch).eq('id', id)

      // Atualiza hash da senha na tabela isolada (se solicitado)
      if (password && password.length >= 6) {
        const newHash = await bcrypt.hash(password, 10)
        await admin.from('agency_team_member_secrets').upsert({
          member_id: id, password_hash: newHash, updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' })
      }

      // Reflete senha no Supabase Auth
      if (password && password.length >= 6 && member.auth_user_id) {
        await admin.auth.admin.updateUserById(member.auth_user_id, { password }).catch(() => {})
      }

      if (Array.isArray(permissions)) {
        await admin.from('agency_team_permissions').delete().eq('team_member_id', id)
        const rows = permissions.filter((p: any) => p.enabled).map((p: any) => ({
          agency_id: ownerId, team_member_id: id,
          module_key: p.module_key, permission_key: p.permission_key, enabled: true,
        }))
        if (rows.length) await admin.from('agency_team_permissions').insert(rows)
      }
      if (Array.isArray(stage_permissions)) {
        await admin.from('agency_team_stage_permissions').delete().eq('team_member_id', id)
        const rows = stage_permissions.map((s: any) => ({
          agency_id: ownerId, team_member_id: id,
          pipeline_type: s.pipeline_type, stage_id: s.stage_id,
          can_view: !!s.can_view, can_edit: !!s.can_edit, can_move: !!s.can_move,
        }))
        if (rows.length) await admin.from('agency_team_stage_permissions').insert(rows)
      }

      // Invalida sessões ativas para refletir mudanças imediatamente
      await admin.from('agency_team_sessions').delete().eq('team_member_id', id)

      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: id, action: 'update_member',
      })
      return json({ ok: true })
    }

    if (action === 'set_status') {
      const { id, status } = body
      if (!['active', 'blocked'].includes(status)) return json({ error: 'Status inválido' }, 400)
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id, auth_user_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

      const { error } = await admin.from('agency_team_members').update({ status }).eq('id', id)
      if (error) return json({ error: error.message }, 400)
      if (status === 'blocked') {
        await admin.from('agency_team_sessions').delete().eq('team_member_id', id)
        if (member.auth_user_id) {
          await admin.auth.admin.updateUserById(member.auth_user_id, { ban_duration: '876000h' }).catch(() => {})
        }
      } else if (status === 'active' && member.auth_user_id) {
        await admin.auth.admin.updateUserById(member.auth_user_id, { ban_duration: 'none' }).catch(() => {})
      }
      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: id, action: `set_status_${status}`,
      })
      return json({ ok: true })
    }

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
        agency_id: ownerId, team_member_id: id, action: 'delete_member',
      })
      return json({ ok: true })
    }

    return json({ error: 'Ação desconhecida' }, 400)
  } catch (e) {
    console.error('team-admin error', e)
    return json({ error: 'Erro interno' }, 500)
  }
})