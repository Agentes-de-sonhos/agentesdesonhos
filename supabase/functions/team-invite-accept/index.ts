import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*, authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function sha256(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function syntheticEmail(login: string, ownerId: string) {
  const safe = String(login).toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${safe}.${ownerId.slice(0, 8)}@team.agentesdesonhos.local`
}

function moduleOf(key: string): string {
  const head = key.split('.')[0]
  const map: Record<string, string> = {
    dashboard: 'dashboard', clients: 'clients', opportunities: 'opportunities', operations: 'operations',
    sales: 'sales', quotes: 'quotes', itineraries: 'itineraries', wallet: 'wallet',
    agenda: 'agenda', tasks: 'agenda', trips: 'agenda', financial: 'financial', marketing: 'marketing',
    academy: 'education', courses: 'education', mentorships: 'education', community: 'community',
    chat: 'community', online_users: 'community', settings: 'settings', account: 'settings',
    subscription: 'settings', integrations: 'settings', team: 'settings', audit: 'settings',
  }
  return map[head] ?? 'tools'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { token, mode, password, full_name } = await req.json()
    if (typeof token !== 'string' || token.length < 32) return json({ error: 'Convite inválido.' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token_hash = await sha256(token)

    const { data: invite } = await admin.from('agency_team_invites')
      .select('*').eq('token_hash', token_hash).maybeSingle()
    if (!invite) return json({ error: 'Convite não encontrado.' }, 404)
    if (invite.revoked_at) return json({ error: 'Este convite foi cancelado.' }, 400)
    if (invite.accepted_at) return json({ error: 'Este convite já foi utilizado.' }, 400)
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'Este convite expirou.' }, 400)

    if (mode === 'inspect') {
      return json({
        email: invite.email, full_name: invite.full_name,
        role_title: invite.role_title, department: invite.department,
      })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'A senha precisa ter ao menos 6 caracteres.' }, 400)
    }
    const name = String(full_name ?? invite.full_name ?? invite.email).trim().slice(0, 120)
    const login = String(invite.email).toLowerCase()

    const { data: taken } = await admin.from('agency_team_members')
      .select('id').eq('login_normalized', login).maybeSingle()
    if (taken) return json({ error: 'Já existe um acesso com este e-mail.' }, 400)

    const email = syntheticEmail(login, invite.agency_id)
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name, is_team_member: true, agency_id: invite.agency_id, team_login: login },
    })
    if (authErr || !created?.user) return json({ error: 'Não foi possível criar o acesso.' }, 400)

    const password_hash = await bcrypt.hash(password, 10)
    const { data: member, error } = await admin.from('agency_team_members').insert({
      agency_id: invite.agency_id, full_name: name, login,
      email: invite.email, role_title: invite.role_title,
      department: invite.department, team_name: invite.team_name,
      access_profile_id: invite.access_profile_id,
      status: 'active', auth_user_id: created.user.id, synthetic_email: email,
      invited_at: invite.created_at, activated_at: new Date().toISOString(),
      created_by: invite.invited_by,
    }).select('id').single()
    if (error || !member) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      return json({ error: error?.message?.includes('Limite') ? error.message : 'Não foi possível concluir o convite.' }, 400)
    }

    await admin.from('agency_team_member_secrets').insert({ member_id: member.id, password_hash })

    const keys: string[] = invite.permission_keys ?? []
    if (keys.length) {
      await admin.from('agency_team_permissions').insert(keys.map(k => ({
        agency_id: invite.agency_id, team_member_id: member.id,
        module_key: moduleOf(k), permission_key: k, enabled: true,
      })))
    }
    const scopes = (invite.scopes ?? {}) as Record<string, string>
    const scopeRows = Object.entries(scopes).map(([module_key, scope]) => ({
      agency_id: invite.agency_id, team_member_id: member.id, module_key, scope,
    }))
    if (scopeRows.length) await admin.from('agency_team_scopes').insert(scopeRows)

    await admin.from('agency_team_invites').update({
      accepted_at: new Date().toISOString(), member_id: member.id,
    }).eq('id', invite.id)

    await admin.from('agency_team_audit_log').insert({
      agency_id: invite.agency_id, team_member_id: member.id, action: 'invite_accepted',
      module_key: 'team', entity_type: 'team_invite', entity_id: invite.id,
    })

    return json({ ok: true, login })
  } catch (e) {
    console.error('team-invite-accept error', e)
    return json({ error: 'Erro interno' }, 500)
  }
})
