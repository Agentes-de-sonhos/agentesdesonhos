/**
 * Autenticação do cliente final na Área do Cliente White Label (Etapa 1).
 *
 * A agência é SEMPRE resolvida pelo domínio (agency_public_domains ativo).
 * Nenhum identificador de agência ou de cliente vindo do navegador é aceito
 * como autorização — trocar IDs na URL não dá acesso a outra conta.
 *
 * O mesmo e-mail pode existir em agências diferentes: cada par
 * (agência, e-mail) é uma conta independente, com senha e sessões próprias.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'
import {
  GENERIC_LOGIN_ERROR,
  GENERIC_RECOVERY_MESSAGE,
  SESSION_TTL_MS,
  isLockedOut,
  isValidEmail,
  nextAttemptState,
  normalizeEmail,
  sanitizeAuditDetails,
  validatePassword,
} from '../_shared/clientAreaGuards.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizeHost(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null

  const audit = async (input: {
    agencyId: string
    action: string
    accountId?: string | null
    clientId?: string | null
    details?: Record<string, unknown>
  }) => {
    await admin.from('client_area_audit_log').insert({
      agency_id: input.agencyId,
      account_id: input.accountId ?? null,
      client_id: input.clientId ?? null,
      action: input.action,
      actor: 'client',
      details: sanitizeAuditDetails(input.details),
      user_agent: userAgent,
    })
  }

  /** Sessão válida → conta + cliente. Nunca devolve hash nem token. */
  const resolveSession = async (token: unknown) => {
    if (typeof token !== 'string' || token.length < 32) return null
    const token_hash = await sha256(token)
    const { data: session } = await admin
      .from('client_area_sessions')
      .select('id, account_id, agency_id, expires_at, revoked_at')
      .eq('token_hash', token_hash)
      .maybeSingle()
    if (!session || session.revoked_at) return null
    if (new Date(session.expires_at).getTime() < Date.now()) return null

    const { data: account } = await admin
      .from('client_area_accounts')
      .select('id, agency_id, client_id, status, email_normalized, password_hash, last_login_at, password_set_by')
      .eq('id', session.account_id)
      .maybeSingle()
    if (!account || account.status !== 'active') return null
    if (account.agency_id !== session.agency_id) return null

    const { data: client } = await admin
      .from('clients')
      .select('id, name, email')
      .eq('id', account.client_id)
      .maybeSingle()

    return { session, account, client }
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = String(body.action ?? 'login')

    // ── Agência a partir do domínio (nunca do corpo)
    const hostname = normalizeHost(body.hostname)
    let agencyId: string | null = null
    if (hostname) {
      const { data: domain } = await admin
        .from('agency_public_domains')
        .select('user_id')
        .eq('hostname', hostname)
        .eq('is_active', true)
        .maybeSingle()
      agencyId = (domain?.user_id as string | undefined) ?? null
    }

    if (action === 'session' || action === 'logout' || action === 'change_password') {
      const resolved = await resolveSession(body.token)
      if (!resolved) return json({ error: 'Sessão expirada.' }, 401)

      // Isolamento: a sessão só vale no domínio da própria agência.
      if (agencyId && resolved.account.agency_id !== agencyId) {
        return json({ error: 'Sessão expirada.' }, 401)
      }

      if (action === 'session') {
        await admin.from('client_area_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', resolved.session.id)
        return json({
          client: {
            id: resolved.client?.id ?? null,
            name: resolved.client?.name ?? null,
            email: resolved.account.email_normalized,
          },
          last_login_at: resolved.account.last_login_at,
        })
      }

      if (action === 'logout') {
        await admin.from('client_area_sessions').delete().eq('id', resolved.session.id)
        await audit({
          agencyId: resolved.account.agency_id,
          action: 'logout',
          accountId: resolved.account.id,
          clientId: resolved.account.client_id,
        })
        return json({ ok: true })
      }

      // change_password
      const currentOk = typeof body.current_password === 'string'
        && await bcrypt.compare(String(body.current_password), resolved.account.password_hash)
      if (!currentOk) return json({ error: 'A senha atual não confere.' }, 400)

      const pwdGuard = validatePassword(body.new_password)
      if (pwdGuard) return json({ error: pwdGuard.error }, pwdGuard.status)
      if (String(body.new_password) === String(body.current_password)) {
        return json({ error: 'A nova senha precisa ser diferente da atual.' }, 400)
      }

      const password_hash = await bcrypt.hash(String(body.new_password), 10)
      await admin.from('client_area_accounts')
        .update({
          password_hash,
          password_updated_at: new Date().toISOString(),
          password_set_by: 'client_changed',
          must_change_password: false,
        })
        .eq('id', resolved.account.id)

      // A senha anterior deixa de funcionar; demais sessões são encerradas.
      await admin.from('client_area_sessions')
        .delete()
        .eq('account_id', resolved.account.id)
        .neq('id', resolved.session.id)

      await audit({
        agencyId: resolved.account.agency_id,
        action: 'password_changed_by_client',
        accountId: resolved.account.id,
        clientId: resolved.account.client_id,
      })
      return json({ ok: true })
    }

    // ── Ações públicas exigem domínio White Label ativo
    if (!agencyId) return json({ error: GENERIC_LOGIN_ERROR }, 400)

    const email = normalizeEmail(body.email)

    if (action === 'recovery') {
      if (isValidEmail(email)) {
        const { data: account } = await admin
          .from('client_area_accounts')
          .select('id, client_id')
          .eq('agency_id', agencyId)
          .eq('email_normalized', email)
          .maybeSingle()
        if (account) {
          await audit({
            agencyId,
            action: 'recovery_requested',
            accountId: account.id,
            clientId: account.client_id,
          })
        }
      }
      // Resposta sempre genérica: nunca revela se o e-mail existe.
      return json({ ok: true, message: GENERIC_RECOVERY_MESSAGE })
    }

    if (action !== 'login') return json({ error: 'Ação inválida.' }, 400)

    const password = typeof body.password === 'string' ? body.password : ''
    if (!isValidEmail(email) || !password) return json({ error: GENERIC_LOGIN_ERROR }, 400)

    const { data: attemptRow } = await admin
      .from('client_area_login_attempts')
      .select('attempts, first_attempt_at, locked_until')
      .eq('agency_id', agencyId)
      .eq('email_normalized', email)
      .maybeSingle()

    if (isLockedOut(attemptRow)) {
      return json({
        error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      }, 429)
    }

    const { data: account } = await admin
      .from('client_area_accounts')
      .select('id, agency_id, client_id, status, password_hash, first_login_at, login_count')
      .eq('agency_id', agencyId)
      .eq('email_normalized', email)
      .maybeSingle()

    const passwordOk = account
      ? await bcrypt.compare(password, account.password_hash)
      : false

    if (!account || !passwordOk || account.status !== 'active') {
      const next = nextAttemptState(attemptRow)
      await admin.from('client_area_login_attempts').upsert({
        agency_id: agencyId,
        email_normalized: email,
        ...next,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agency_id,email_normalized' })

      if (next.locked_until && account) {
        await audit({
          agencyId,
          action: 'login_throttled',
          accountId: account.id,
          clientId: account.client_id,
          details: { attempts: next.attempts },
        })
      }
      return json({ error: GENERIC_LOGIN_ERROR }, 401)
    }

    const token = newToken()
    const token_hash = await sha256(token)
    const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    await admin.from('client_area_sessions').insert({
      account_id: account.id,
      agency_id: agencyId,
      token_hash,
      expires_at,
      user_agent: userAgent,
    })

    const isFirst = !account.first_login_at
    await admin.from('client_area_accounts').update({
      last_login_at: new Date().toISOString(),
      first_login_at: account.first_login_at ?? new Date().toISOString(),
      login_count: (account.login_count ?? 0) + 1,
    }).eq('id', account.id)

    await admin.from('client_area_login_attempts')
      .delete().eq('agency_id', agencyId).eq('email_normalized', email)

    if (isFirst) {
      await audit({ agencyId, action: 'first_login', accountId: account.id, clientId: account.client_id })
    }
    await audit({ agencyId, action: 'login_success', accountId: account.id, clientId: account.client_id })

    const { data: client } = await admin
      .from('clients').select('id, name').eq('id', account.client_id).maybeSingle()

    return json({
      token,
      expires_at,
      client: { id: client?.id ?? null, name: client?.name ?? null, email },
    })
  } catch (e) {
    console.error('client-area-auth error', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Não foi possível concluir a operação.' }, 500)
  }
})
