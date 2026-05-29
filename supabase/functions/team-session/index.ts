import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-team-token',
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const token = body?.token || req.headers.get('x-team-token')
    const action = body?.action || 'validate' // 'validate' | 'logout'

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Token ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token_hash = await sha256(token)

    if (action === 'logout') {
      await admin.from('agency_team_sessions').delete().eq('token_hash', token_hash)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: session } = await admin
      .from('agency_team_sessions')
      .select('id, team_member_id, expires_at')
      .eq('token_hash', token_hash)
      .maybeSingle()

    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Sessão expirada' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: member } = await admin
      .from('agency_team_members')
      .select('id, agency_id, login, full_name, role_title, status')
      .eq('id', session.team_member_id)
      .maybeSingle()

    if (!member || member.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Usuário inativo' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: perms } = await admin
      .from('agency_team_permissions').select('module_key, permission_key, enabled')
      .eq('team_member_id', member.id)
    const { data: stagePerms } = await admin
      .from('agency_team_stage_permissions').select('pipeline_type, stage_id, can_view, can_edit, can_move')
      .eq('team_member_id', member.id)

    await admin.from('agency_team_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', session.id)

    return new Response(JSON.stringify({
      member, permissions: perms ?? [], stage_permissions: stagePerms ?? [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('team-session error', e)
    return new Response(JSON.stringify({ error: 'Erro de sessão' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})