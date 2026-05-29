import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
      const { full_name, login, password, role_title, permissions, stage_permissions } = body
      if (!full_name || !login || !password || password.length < 6) {
        return json({ error: 'Dados inválidos. Senha precisa ter ao menos 6 caracteres.' }, 400)
      }
      // Verifica limite
      const { count } = await admin.from('agency_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', ownerId).eq('status', 'active')
      if ((count ?? 0) >= 6) return json({ error: 'Limite de 6 usuários atingido' }, 400)

      // Login único global
      const { data: existing } = await admin.from('agency_team_members')
        .select('id').eq('login_normalized', String(login).toLowerCase().trim()).maybeSingle()
      if (existing) return json({ error: 'Este login já está em uso' }, 400)

      const password_hash = await bcrypt.hash(password, 10)
      const { data: created, error } = await admin.from('agency_team_members').insert({
        agency_id: ownerId, full_name, login: login.trim(), password_hash,
        role_title: role_title ?? null, status: 'active',
      }).select('id').single()
      if (error) return json({ error: error.message }, 400)

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
      const { id, full_name, role_title, password, permissions, stage_permissions } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

      const patch: any = { updated_at: new Date().toISOString() }
      if (full_name !== undefined) patch.full_name = full_name
      if (role_title !== undefined) patch.role_title = role_title
      if (password && password.length >= 6) patch.password_hash = await bcrypt.hash(password, 10)
      await admin.from('agency_team_members').update(patch).eq('id', id)

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
        .select('id, agency_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)

      const { error } = await admin.from('agency_team_members').update({ status }).eq('id', id)
      if (error) return json({ error: error.message }, 400)
      if (status === 'blocked') {
        await admin.from('agency_team_sessions').delete().eq('team_member_id', id)
      }
      await admin.from('agency_team_audit_log').insert({
        agency_id: ownerId, team_member_id: id, action: `set_status_${status}`,
      })
      return json({ ok: true })
    }

    if (action === 'delete') {
      const { id } = body
      const { data: member } = await admin.from('agency_team_members')
        .select('id, agency_id').eq('id', id).maybeSingle()
      if (!member || member.agency_id !== ownerId) return json({ error: 'Acesso negado' }, 403)
      await admin.from('agency_team_members').delete().eq('id', id)
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