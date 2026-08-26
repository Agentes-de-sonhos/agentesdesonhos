import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  hostCandidates,
  loginCandidates,
  originAllowed,
  pickAgencyMember,
  resolveAgencyFromDomains,
} from './resolve.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/**
 * Resolve o identificador técnico de autenticação de um colaborador do painel
 * administrativo white label, SEMPRE dentro da agência dona do hostname.
 *
 * Respostas propositalmente genéricas: `{ email: null }` para login inexistente,
 * colaborador de outra agência, colaborador inativo, domínio inativo ou painel
 * desabilitado. Nunca revela se o login existe em outra agência.
 * Contas master (e-mail real) também recebem `{ email: null }` e seguem o login
 * normal no cliente.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { login, hostname } = await req.json().catch(() => ({}))
    if (typeof login !== 'string' || typeof hostname !== 'string') {
      return json({ email: null })
    }

    if (!originAllowed(
      { origin: req.headers.get('origin'), referer: req.headers.get('referer') },
      hostname,
    )) {
      return json({ email: null })
    }

    const hosts = hostCandidates(hostname)
    const logins = loginCandidates(login)
    if (!hosts.length || !logins.length) return json({ email: null })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: domains } = await admin
      .from('agency_public_domains')
      .select('user_id, hostname, is_active, admin_portal_enabled')
      .in('hostname', hosts)

    const agencyId = resolveAgencyFromDomains(domains as any, hostname)
    if (!agencyId) return json({ email: null })

    const { data: members } = await admin
      .from('agency_team_members')
      .select('agency_id, login_normalized, status, synthetic_email')
      .eq('agency_id', agencyId)
      .in('login_normalized', logins)

    const member = pickAgencyMember(members as any, agencyId, login)
    if (!member?.synthetic_email) return json({ email: null })

    // O identificador técnico volta apenas para o signInWithPassword; jamais
    // é exibido, logado, colocado na URL ou persistido pelo cliente.
    return json({ email: member.synthetic_email, team: true })
  } catch (e) {
    console.error('agency-admin-resolve-login error')
    return json({ email: null })
  }
})
