import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function loginCandidates(login: string) {
  const normalized = login.toLowerCase().trim()
  const candidates = new Set([normalized])

  if (normalized.endsWith('@agentedesonhos.com.br')) {
    candidates.add(normalized.replace('@agentedesonhos.com.br', '@agentesdesonhos.com.br'))
  }

  return Array.from(candidates)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { login } = await req.json()
    if (!login || typeof login !== 'string') {
      return new Response(JSON.stringify({ error: 'login obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const candidates = loginCandidates(login)

    const { data } = await admin
      .from('agency_team_members')
      .select('synthetic_email, status')
      .in('login_normalized', candidates)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data?.synthetic_email) {
      return new Response(JSON.stringify({ email: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ email: data.synthetic_email, status: data.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('team-resolve-login error', e)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})