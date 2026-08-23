/**
 * Gestão do acesso do cliente à Área do Cliente White Label (Etapa 1).
 *
 * Ator: usuário da agência (proprietário/master ou colaborador com a permissão
 * `clients.manage_access`). A agência NUNCA vem do corpo da requisição: é
 * resolvida no servidor a partir do JWT via `client_area_admin_context()`.
 *
 * A senha em texto aberto existe apenas na resposta da criação/redefinição.
 * Nada de senha em banco, log ou auditoria.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@2.4.3'
import {
  assertCanManageAccess,
  assertClientCanHaveAccess,
  assertSameAgency,
  generateSecurePassword,
  hostFromOrigin,
  isPlatformOriginHost,
  isUuid,
  normalizeEmail,
  publicAccountView,
  sanitizeAuditDetails,
  validatePassword,
} from '../_shared/clientAreaGuards.ts'


/**
 * CORS restrito: a gestão só acontece dentro da aplicação da plataforma
 * (app oficial, prévias e desenvolvimento). Domínios White Label não gerenciam
 * acesso — lá roda apenas a Área do Cliente pública.
 */
const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

const corsFor = (origin: string | null): Record<string, string> => {
  const host = hostFromOrigin(origin)
  const allowed = !host ? '*' : isPlatformOriginHost(host) ? String(origin) : ''
  return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': allowed || 'null' }
}

const randomBytes = (size: number) => crypto.getRandomValues(new Uint8Array(size))

Deno.serve(async (req) => {
  const originHeader = req.headers.get('origin')
  const corsHeaders = corsFor(originHeader)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const originHost = hostFromOrigin(originHeader)
  if (originHost && !isPlatformOriginHost(originHost)) {
    return json({ error: 'Origem não autorizada.' }, 403)
  }


  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Sessão expirada. Entre novamente.' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401)

    const { data: ctxData, error: ctxError } = await userClient.rpc('client_area_admin_context')
    if (ctxError) {
      console.error('client-area-admin context error', ctxError.message)
      return json({ error: 'Não foi possível validar o seu acesso.' }, 403)
    }
    const ctx = ctxData as {
      authenticated: boolean
      agency_id: string
      is_team_member: boolean
      white_label_active: boolean
      can_manage: boolean
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = String(body.action ?? '')
    const clientId = body.client_id

    if (!isUuid(clientId)) return json({ error: 'Cliente inválido.' }, 400)

    // ── Somente leitura de status: exige White Label ativo, não a permissão de gestão
    if (action === 'status') {
      if (!ctx.white_label_active) {
        return json({ white_label_active: false, exists: false }, 200)
      }
      const { data, error } = await userClient.rpc('client_area_account_status', { _client_id: clientId })
      if (error) return json({ error: 'Não foi possível consultar o status do acesso.' }, 403)
      return json(data)
    }

    const guard = assertCanManageAccess(ctx)
    if (guard) return json({ error: guard.error }, guard.status)

    // ── Isolamento: o cliente precisa pertencer à agência do ator
    const { data: client } = await admin
      .from('clients')
      .select('id, name, email, user_id')
      .eq('id', clientId)
      .maybeSingle()

    if (!client) return json({ error: 'Cliente não encontrado.' }, 404)

    const { data: clientAgencyId } = await admin.rpc('resolve_agency_id_for_user', {
      _user_id: client.user_id,
    })
    const isolation = assertSameAgency(clientAgencyId as string | null, ctx.agency_id)
    if (isolation) return json({ error: isolation.error }, isolation.status)

    const { data: account } = await admin
      .from('client_area_accounts')
      .select('*')
      .eq('client_id', clientId)
      .eq('agency_id', ctx.agency_id)
      .maybeSingle()

    const audit = async (auditAction: string, details?: Record<string, unknown>, accountId?: string | null) => {
      await admin.from('client_area_audit_log').insert({
        agency_id: ctx.agency_id,
        account_id: accountId ?? account?.id ?? null,
        client_id: clientId,
        action: auditAction,
        actor: 'agency',
        actor_user_id: user.id,
        details: sanitizeAuditDetails(details),
        user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
      })
    }

    // ── Criação ou redefinição de senha
    if (action === 'create_access' || action === 'reset_password') {
      const emailGuard = assertClientCanHaveAccess(client)
      if (emailGuard) return json({ error: emailGuard.error }, emailGuard.status)

      if (action === 'create_access' && account) {
        return json({ error: 'Este cliente já possui acesso. Use “Gerar nova senha”.' }, 409)
      }
      if (action === 'reset_password' && !account) {
        return json({ error: 'Este cliente ainda não possui acesso.' }, 404)
      }

      const mode = body.mode === 'manual' ? 'manual' : 'auto'
      let password: string
      if (mode === 'manual') {
        const pwdGuard = validatePassword(body.password)
        if (pwdGuard) return json({ error: pwdGuard.error }, pwdGuard.status)
        password = String(body.password)
      } else {
        password = generateSecurePassword(randomBytes)
      }

      const password_hash = await bcrypt.hash(password, 10)
      const email_normalized = normalizeEmail(client.email)
      const password_set_by = mode === 'manual' ? 'agency_defined' : 'agency_generated'

      let accountId = account?.id ?? null

      if (account) {
        const { error } = await admin
          .from('client_area_accounts')
          .update({
            password_hash,
            email_normalized,
            password_updated_at: new Date().toISOString(),
            password_set_by,
            status: 'active',
          })
          .eq('id', account.id)
          .eq('agency_id', ctx.agency_id)
        if (error) {
          console.error('client-area-admin reset error', error.message)
          return json({ error: 'Não foi possível redefinir o acesso.' }, 500)
        }
        // Nova senha invalida imediatamente as sessões anteriores.
        await admin.from('client_area_sessions').delete().eq('account_id', account.id)
        await admin.from('client_area_login_attempts')
          .delete().eq('agency_id', ctx.agency_id).eq('email_normalized', email_normalized)
        await audit('password_reset_by_agency', { mode })
      } else {
        const { data: created, error } = await admin
          .from('client_area_accounts')
          .insert({
            agency_id: ctx.agency_id,
            client_id: clientId,
            email_normalized,
            password_hash,
            password_set_by,
            created_by: user.id,
          })
          .select('*')
          .single()
        if (error) {
          console.error('client-area-admin create error', error.message)
          const duplicated = String(error.message).includes('client_area_accounts_agency_email_unique')
          return json({
            error: duplicated
              ? 'Já existe um acesso com este e-mail nesta agência.'
              : 'Não foi possível criar o acesso.',
          }, duplicated ? 409 : 500)
        }
        accountId = created.id
        await audit('account_created', { mode }, created.id)
      }

      const { data: fresh } = await admin
        .from('client_area_accounts').select('*').eq('id', accountId).maybeSingle()

      return json({
        ok: true,
        // Única exposição da senha: agora, nesta resposta. Nunca é persistida.
        password,
        account: publicAccountView(fresh as Record<string, unknown> | null),
      })
    }

    // ── Bloqueio / reativação
    if (action === 'block' || action === 'unblock') {
      if (!account) return json({ error: 'Este cliente ainda não possui acesso.' }, 404)
      const status = action === 'block' ? 'blocked' : 'active'
      const { error } = await admin
        .from('client_area_accounts')
        .update({ status })
        .eq('id', account.id)
        .eq('agency_id', ctx.agency_id)
      if (error) return json({ error: 'Não foi possível atualizar o acesso.' }, 500)

      if (action === 'block') {
        await admin.from('client_area_sessions').delete().eq('account_id', account.id)
      }
      await audit(action === 'block' ? 'account_blocked' : 'account_unblocked')

      const { data: fresh } = await admin
        .from('client_area_accounts').select('*').eq('id', account.id).maybeSingle()
      return json({ ok: true, account: publicAccountView(fresh as Record<string, unknown> | null) })
    }

    return json({ error: 'Ação inválida.' }, 400)
  } catch (e) {
    console.error('client-area-admin error', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'Não foi possível concluir a operação.' }, 500)
  }
})
