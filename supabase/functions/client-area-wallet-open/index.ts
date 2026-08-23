import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getClientIP } from '../_shared/rate-limiter.ts'
import { hostFromOrigin, isPlatformOriginHost } from '../_shared/clientAreaGuards.ts'

/**
 * Abre a Carteira Digital pública a partir de uma autorização de uso único
 * emitida na Área do Cliente autenticada (`client-area-auth` → wallet_grant).
 *
 * Garantias:
 * - A autorização vale UMA vez e por 120 segundos (marcada como usada aqui).
 * - A senha da carteira nunca é enviada ao navegador nem exigida do cliente:
 *   o payload é montado pelo mesmo RPC usado no fluxo público.
 * - Link, código e slug precisam bater com a viagem da autorização.
 * - Erros são genéricos: nunca revelam se o código ou a viagem existem.
 * - CORS restrito: apenas a plataforma ou um domínio White Label ativo.
 */

const BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

const corsFor = (allowed: string) => ({ ...BASE_HEADERS, 'Access-Control-Allow-Origin': allowed })

const GENERIC_ERROR = 'Este acesso expirou. Volte à Área do Cliente e abra a carteira novamente.'

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Origem aceita: plataforma/prévia ou domínio White Label ativo cadastrado. */
async function allowedOrigin(admin: any, origin: string | null): Promise<string | null> {
  const host = hostFromOrigin(origin)
  if (!host) return '*'
  if (isPlatformOriginHost(host)) return String(origin)
  const { data } = await admin
    .from('agency_public_domains')
    .select('hostname')
    .eq('hostname', host)
    .eq('is_active', true)
    .maybeSingle()
  return data ? String(origin) : null
}


Deno.serve(async (req) => {
  const originHeader = req.headers.get('origin')

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsFor(originHeader && originHeader !== 'null' ? originHeader : '*'),
    })
  }

  let headers = corsFor('null')
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })

  if (req.method !== 'POST') return json({ error: GENERIC_ERROR }, 405)

  try {
    const origin = await allowedOrigin(admin, originHeader)
    if (!origin) return json({ error: GENERIC_ERROR }, 403)
    headers = corsFor(origin)

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const grant = typeof body.grant === 'string' ? body.grant.trim() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const agencySlug = typeof body.agency_slug === 'string' ? body.agency_slug.trim().toLowerCase() : ''

    if (!/^[a-f0-9]{64}$/i.test(grant) || code.length < 16 || !agencySlug) {
      return json({ error: GENERIC_ERROR }, 400)
    }

    const limit = await checkRateLimit(await sha256(getClientIP(req)), 'client-area-wallet-open', 20, 60)
    if (!limit.allowed) return json({ error: 'Muitas tentativas. Aguarde alguns segundos.' }, 429)



    const tokenHash = await sha256(grant)
    const { data: row } = await admin
      .from('client_area_wallet_grants')
      .select('id, agency_id, trip_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: GENERIC_ERROR }, 401)
    }

    const { data: trip } = await admin
      .from('trips')
      .select('id, user_id, public_access_code, access_password, is_locked')
      .eq('id', row.trip_id)
      .maybeSingle()

    // Vínculo canônico: a carteira precisa ser da agência que emitiu a autorização.
    if (!trip || trip.public_access_code !== code || trip.user_id !== row.agency_id) {
      return json({ error: GENERIC_ERROR }, 401)
    }

    // Consome a autorização ANTES de devolver os dados (uso único e expiração
    // decididos na própria escrita, o que evita corrida entre duas aberturas).
    const { data: consumed } = await admin
      .from('client_area_wallet_grants')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('id')
      .maybeSingle()
    if (!consumed) return json({ error: GENERIC_ERROR }, 401)


    const { data: payload, error } = await admin.rpc('verify_trip_by_public_code', {
      p_agency_slug: agencySlug,
      p_code: code,
      p_password: trip.access_password ?? '',
    })
    if (error || !payload || (payload as any).error) return json({ error: GENERIC_ERROR }, 401)

    return json(payload)
  } catch (_err) {
    return json({ error: GENERIC_ERROR }, 500)
  }
})
