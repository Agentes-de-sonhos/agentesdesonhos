// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_ACTIONS = new Set([
  'client.create','client.update','client.delete',
  'opportunity.create','opportunity.update','opportunity.delete','opportunity.stage_move',
  'operation.create','operation.update','operation.delete','operation.stage_move',
  'sale.create','sale.update','sale.delete',
  'expense.create','expense.update','expense.delete',
  'income.create','income.update','income.delete',
  'goal.update',
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Identifica o usuário
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userRes } = await userClient.auth.getUser()
    const user = userRes?.user
    if (!user) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({})) as any
    const action = String(body?.action ?? '')
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Resolve team_member + agency
    const { data: member } = await admin
      .from('agency_team_members')
      .select('id, agency_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    // Master (sem team_member): não loga
    if (!member) {
      return new Response(JSON.stringify({ ok: true, skipped: 'master' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    const details = {
      entity_type: typeof body?.entity_type === 'string' ? body.entity_type : null,
      entity_id: typeof body?.entity_id === 'string' ? body.entity_id : null,
      ...(body?.details && typeof body.details === 'object' ? body.details : {}),
    }

    await admin.from('agency_team_audit_log').insert({
      agency_id: member.agency_id,
      team_member_id: member.id,
      action,
      details,
      ip_address: ip,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})