/**
 * Autenticação do cliente final na Área do Cliente White Label (Etapa 1.1).
 *
 * Regras de segurança:
 * - TODA ação exige `hostname`. A agência é resolvida no servidor pelo RPC
 *   `client_area_domain_context`, que valida domínio ativo + elegibilidade
 *   canônica White Label. `agency_id` do navegador nunca é aceito.
 * - O header `Origin` precisa corresponder ao domínio informado (ou ser um
 *   ambiente autorizado da plataforma). CORS restrito a essas origens.
 * - Uma sessão criada no domínio de uma agência é recusada em qualquer outro.
 * - Limitação combinada: por conta (agência + e-mail), por origem (hash com
 *   pepper, nunca o endereço em texto aberto) e limite global da função.
 * - Sessão: token opaco de 32 bytes, guardado apenas como hash, validade
 *   deslizante de 30 dias, prazo absoluto de 180 dias e rotação a cada 7 dias.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'
import {
  ACCOUNT_ATTEMPT_POLICY,
  type DomainContext,
  GENERIC_LOGIN_ERROR,
  GENERIC_RECOVERY_MESSAGE,
  ORIGIN_ATTEMPT_POLICY,
  assertDomainContext,
  assertHostnamePresent,
  assertOriginMatchesHost,
  isLockedOut,
  isSessionUsable,
  isValidEmail,
  nextAttemptState,
  normalizeEmail,
  normalizeHost,
  originHashInput,
  resolveAllowedOrigin,
  sanitizeAuditDetails,
  shouldRotateSession,
  slidingExpiry,
  SESSION_ABSOLUTE_MS,
  SESSION_TTL_MS,
  validatePassword,
} from '../_shared/clientAreaGuards.ts'
import { checkRateLimit, getClientIP } from '../_shared/rate-limiter.ts'

const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

const corsFor = (allowedOrigin: string) => ({
  ...BASE_HEADERS,
  'Access-Control-Allow-Origin': allowedOrigin,
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

Deno.serve(async (req) => {
  const originHeader = req.headers.get('origin')

  // Preflight: só ecoa origens plausíveis (domínio White Label ou plataforma).
  // A validação definitiva (origem × domínio × agência) acontece na requisição.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsFor(originHeader && originHeader !== 'null' ? originHeader : '*'),
    })
  }

  let headers = corsFor('*')
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })

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
      .select('id, account_id, agency_id, expires_at, absolute_expires_at, revoked_at, rotated_at')
      .eq('token_hash', token_hash)
      .maybeSingle()
    if (!isSessionUsable(session as any)) return null

    const { data: account } = await admin
      .from('client_area_accounts')
      .select('id, agency_id, client_id, status, email_normalized, password_hash, last_login_at, password_set_by')
      .eq('id', session!.account_id)
      .maybeSingle()
    if (!account || account.status !== 'active') return null
    if (account.agency_id !== session!.agency_id) return null

    const { data: client } = await admin
      .from('clients')
      .select('id, name, email')
      .eq('id', account.client_id)
      .maybeSingle()

    return { session: session!, account, client }
  }

  /** Renova a validade deslizante e rotaciona o token quando devido. */
  const touchSession = async (session: any): Promise<string | null> => {
    const now = Date.now()
    const patch: Record<string, unknown> = {
      last_seen_at: new Date(now).toISOString(),
      expires_at: slidingExpiry(session, now),
    }
    let rotated: string | null = null
    if (shouldRotateSession(session, now)) {
      rotated = newToken()
      patch.token_hash = await sha256(rotated)
      patch.rotated_at = new Date(now).toISOString()
    }
    await admin.from('client_area_sessions').update(patch).eq('id', session.id)
    return rotated
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = String(body.action ?? 'login')

    // ── 1) Hostname obrigatório em TODAS as ações (nunca aceito em silêncio)
    const hostGuard = assertHostnamePresent(body.hostname)
    if (hostGuard) return json({ error: hostGuard.error }, hostGuard.status)
    const hostname = normalizeHost(body.hostname)

    // ── 2) Origem precisa corresponder ao domínio informado
    const originGuard = assertOriginMatchesHost(originHeader, hostname)
    if (originGuard) return json({ error: originGuard.error }, originGuard.status)

    // ── 3) Agência resolvida pelo domínio + elegibilidade canônica White Label
    const { data: ctxData } = await admin.rpc('client_area_domain_context', { _hostname: hostname })
    const domain = (ctxData ?? null) as DomainContext | null
    const domainGuard = assertDomainContext(domain)
    if (domainGuard) return json({ error: domainGuard.error }, domainGuard.status)
    const agencyId = domain!.agency_id as string

    // CORS definitivo: origem × domínio da agência
    const allowedOrigin = resolveAllowedOrigin(originHeader, hostname)
    if (!allowedOrigin) return json({ error: 'Origem não autorizada.' }, 403)
    headers = corsFor(allowedOrigin)

    // ── 4) Origem da tentativa (hash com pepper — nunca em texto aberto)
    const pepper = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'client-area'
    const originHash = await sha256(originHashInput(pepper, agencyId, getClientIP(req)))

    // Limite global da função (protege a infraestrutura)
    const globalLimit = await checkRateLimit(originHash, 'client-area-auth', 60, 60)
    if (!globalLimit.allowed) {
      return json({ error: 'Muitas tentativas. Aguarde alguns segundos e tente novamente.' }, 429)
    }

    if (action === 'session' || action === 'logout' || action === 'change_password') {
      const resolved = await resolveSession(body.token)
      if (!resolved) return json({ error: 'Sessão expirada.' }, 401)

      // Isolamento: a sessão só vale no domínio da própria agência.
      if (resolved.account.agency_id !== agencyId) {
        return json({ error: 'Sessão expirada.' }, 401)
      }

      if (action === 'session') {
        const rotated = await touchSession(resolved.session)
        return json({
          client: {
            id: resolved.client?.id ?? null,
            name: resolved.client?.name ?? null,
            email: resolved.account.email_normalized,
          },
          last_login_at: resolved.account.last_login_at,
          ...(rotated ? { token: rotated } : {}),
        })
      }

      if (action === 'logout') {
        await admin.from('client_area_sessions').delete().eq('id', resolved.session.id)
        await audit({
          agencyId,
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

      // A sessão atual é preservada, mas com token novo (rotação obrigatória).
      const rotatedToken = newToken()
      await admin.from('client_area_sessions')
        .update({
          token_hash: await sha256(rotatedToken),
          rotated_at: new Date().toISOString(),
          expires_at: slidingExpiry(resolved.session as any),
        })
        .eq('id', resolved.session.id)

      await audit({
        agencyId,
        action: 'password_changed_by_client',
        accountId: resolved.account.id,
        clientId: resolved.account.client_id,
      })
      return json({ ok: true, token: rotatedToken })
    }

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
      // Resposta sempre genérica: nunca revela se o e-mail existe e nunca
      // promete envio de e-mail (não há disparo automático nesta etapa).
      return json({
        ok: true,
        message: GENERIC_RECOVERY_MESSAGE,
        whatsapp: domain!.whatsapp ?? null,
        agency_name: domain!.agency_name ?? null,
      })
    }

    if (action !== 'login') return json({ error: 'Ação inválida.' }, 400)

    const password = typeof body.password === 'string' ? body.password : ''
    if (!isValidEmail(email) || !password) return json({ error: GENERIC_LOGIN_ERROR }, 400)

    // ── Limitação por origem (impede pulverização em vários e-mails)
    const { data: originRow } = await admin
      .from('client_area_origin_attempts')
      .select('attempts, first_attempt_at, locked_until')
      .eq('agency_id', agencyId)
      .eq('origin_hash', originHash)
      .maybeSingle()

    if (isLockedOut(originRow as any)) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429)
    }

    const { data: attemptRow } = await admin
      .from('client_area_login_attempts')
      .select('attempts, first_attempt_at, locked_until')
      .eq('agency_id', agencyId)
      .eq('email_normalized', email)
      .maybeSingle()

    if (isLockedOut(attemptRow as any)) {
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
      // A origem é sempre penalizada.
      const nextOrigin = nextAttemptState(originRow as any, Date.now(), ORIGIN_ATTEMPT_POLICY)
      await admin.from('client_area_origin_attempts').upsert({
        agency_id: agencyId,
        origin_hash: originHash,
        ...nextOrigin,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agency_id,origin_hash' })

      // A conta só é penalizada enquanto a origem não estiver saturada: assim
      // uma única origem não consegue manter uma conta legítima bloqueada.
      if (!nextOrigin.locked_until) {
        const next = nextAttemptState(attemptRow as any, Date.now(), ACCOUNT_ATTEMPT_POLICY)
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
      } else if (account) {
        await audit({
          agencyId,
          action: 'origin_throttled',
          accountId: account.id,
          clientId: account.client_id,
          details: { attempts: nextOrigin.attempts },
        })
      }

      return json({ error: GENERIC_LOGIN_ERROR }, 401)
    }

    const token = newToken()
    const token_hash = await sha256(token)
    const now = Date.now()
    const expires_at = new Date(now + SESSION_TTL_MS).toISOString()
    const absolute_expires_at = new Date(now + SESSION_ABSOLUTE_MS).toISOString()

    await admin.from('client_area_sessions').insert({
      account_id: account.id,
      agency_id: agencyId,
      token_hash,
      expires_at,
      absolute_expires_at,
      rotated_at: new Date(now).toISOString(),
      user_agent: userAgent,
    })

    const isFirst = !account.first_login_at
    await admin.from('client_area_accounts').update({
      last_login_at: new Date(now).toISOString(),
      first_login_at: account.first_login_at ?? new Date(now).toISOString(),
      login_count: (account.login_count ?? 0) + 1,
    }).eq('id', account.id)

    // Login bem-sucedido zera as tentativas da conta e alivia a origem.
    await admin.from('client_area_login_attempts')
      .delete().eq('agency_id', agencyId).eq('email_normalized', email)
    await admin.from('client_area_origin_attempts')
      .delete().eq('agency_id', agencyId).eq('origin_hash', originHash)

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
