import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { login, password } = await req.json()
    if (!login || !password || typeof login !== 'string' || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: member } = await admin
      .from('agency_team_members')
      .select('id, agency_id, status, full_name, login, role_title')
      .eq('login_normalized', login.toLowerCase().trim())
      .maybeSingle()

    if (!member) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (member.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Usuário bloqueado. Entre em contato com a sua agência.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: secret } = await admin
      .from('agency_team_member_secrets')
      .select('password_hash')
      .eq('member_id', member.id)
      .maybeSingle()

    if (!secret?.password_hash) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const ok = await bcrypt.compare(password, secret.password_hash)
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    const token_hash = await sha256(token)
    const expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

    await admin.from('agency_team_sessions').insert({
      team_member_id: member.id, token_hash, expires_at,
      user_agent: req.headers.get('user-agent') ?? null,
    })

    await admin.from('agency_team_members').update({ last_login_at: new Date().toISOString() }).eq('id', member.id)
    await admin.from('agency_team_audit_log').insert({
      agency_id: member.agency_id, team_member_id: member.id, action: 'login',
    })

    // Carrega permissões
    const { data: perms } = await admin
      .from('agency_team_permissions')
      .select('module_key, permission_key, enabled')
      .eq('team_member_id', member.id)

    const { data: stagePerms } = await admin
      .from('agency_team_stage_permissions')
      .select('pipeline_type, stage_id, can_view, can_edit, can_move')
      .eq('team_member_id', member.id)

    return new Response(JSON.stringify({
      token, expires_at,
      member: {
        id: member.id, agency_id: member.agency_id, login: member.login,
        full_name: member.full_name, role_title: member.role_title,
      },
      permissions: perms ?? [],
      stage_permissions: stagePerms ?? [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('team-login error', e)
    return new Response(JSON.stringify({ error: 'Erro ao autenticar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})