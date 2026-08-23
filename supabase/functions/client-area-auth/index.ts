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
import {
  WALLET_GRANT_TTL_MS,
  SIGNED_URL_TTL_SECONDS,
  agencySlugFromName,
  isAllowedDocumentFile,
  isPublishedItinerary,
  isUuid,
  normalizeDocumentCategory,
  storagePathFromValue,
} from '../_shared/clientAreaDocs.ts'
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

/**
 * Campos livres do serviço que NUNCA podem chegar ao passageiro: valores,
 * custos, comissões, condições de pagamento, fornecedores e anotações internas.
 * A regra é por lista de bloqueio + apenas valores primitivos e curtos, para
 * que qualquer chave nova criada no CRM não vaze por acidente.
 */
const BLOCKED_DETAIL_KEY =
  /(valor|price|preco|preço|amount|total|cost|custo|comiss|fee|tax|imposto|markup|margin|lucro|profit|net|payment|pagamento|parcel|installment|entrada|entry|discount|desconto|supplier|fornecedor|operadora|operator|internal|interno|nota|note|obs|cpf|passaporte|passport|document)/i

function safeServiceDetails(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, unknown> = {}
  let kept = 0
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (kept >= 20) break
    if (BLOCKED_DETAIL_KEY.test(key)) continue
    if (typeof value === 'boolean' || typeof value === 'number') {
      out[key] = value
      kept += 1
    } else if (typeof value === 'string') {
      const text = value.trim()
      if (!text || text.length > 300) continue
      out[key] = text
      kept += 1
    }
    // Objetos e listas são descartados: só texto simples é seguro de exibir.
  }
  return kept > 0 ? out : null
}

/** Situação do contrato em linguagem do passageiro (só rótulos confiáveis). */
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  generated: 'Emitido',
  sent: 'Enviado ao cliente',
  signed: 'Assinado',
  cancelled: 'Cancelado',
  superseded: 'Substituído',
}

interface DocRow {
  id: string
  source: 'attachment' | 'contract'
  name: string
  category: string
  trip_id: string
  trip_title: string | null
  available_at: string | null
  file_type: string | null
  file_size: number | null
  status_label?: string | null
  /** Apenas servidor: nunca sai na resposta. */
  bucket: string
  path: string
}

/** Metadados seguros do documento (sem bucket, caminho ou id de venda). */
const publicDoc = (d: DocRow) => ({
  id: d.id,
  source: d.source,
  name: d.name,
  category: d.category,
  trip_id: d.trip_id,
  trip_title: d.trip_title,
  available_at: d.available_at,
  file_type: d.file_type,
  file_size: d.file_size,
  ...(d.status_label ? { status_label: d.status_label } : {}),
})

/**
 * Documentos que o passageiro pode ver. Escopo triplo e sempre do servidor:
 * agência do domínio + cliente da sessão + marcação explícita
 * `client_visible`. Nada é listado por nome de arquivo ou por herança.
 */
async function collectClientDocuments(
  admin: any,
  agencyId: string,
  clientId: string,
  operationId?: string | null,
): Promise<DocRow[]> {
  let opsQuery = admin
    .from('operations')
    .select('id, title, destination')
    .eq('user_id', agencyId)
    .eq('client_id', clientId)
  if (operationId) opsQuery = opsQuery.eq('id', operationId)
  const { data: ops } = await opsQuery.limit(200)
  const operations = (ops ?? []) as { id: string; title: string | null; destination: string | null }[]
  if (!operations.length) return []

  const ids = operations.map((o) => o.id)
  const titleOf = new Map(operations.map((o) => [o.id, o.title || o.destination || null]))

  const [attachRes, salesRes] = await Promise.all([
    admin
      .from('operation_attachments')
      .select('id, operation_id, file_name, file_type, file_size, category, file_url, created_at, client_visible_at')
      .eq('user_id', agencyId)
      .eq('client_visible', true)
      .in('operation_id', ids)
      .limit(300),
    admin
      .from('sales')
      .select('id, source_operation_id')
      .eq('user_id', agencyId)
      .eq('client_id', clientId)
      .in('source_operation_id', ids)
      .limit(200),
  ])

  const docs: DocRow[] = []

  for (const a of (attachRes.data ?? []) as any[]) {
    const name = String(a.file_name || '').trim() || 'Documento'
    if (!isAllowedDocumentFile(name, a.file_size)) continue
    const path = storagePathFromValue('operation-files', a.file_url)
    if (!path) continue
    docs.push({
      id: a.id,
      source: 'attachment',
      name,
      category: normalizeDocumentCategory(a.category),
      trip_id: a.operation_id,
      trip_title: titleOf.get(a.operation_id) ?? null,
      available_at: a.client_visible_at ?? a.created_at ?? null,
      file_type: a.file_type ?? null,
      file_size: typeof a.file_size === 'number' ? a.file_size : null,
      bucket: 'operation-files',
      path,
    })
  }

  const sales = (salesRes.data ?? []) as { id: string; source_operation_id: string | null }[]
  const saleToOp = new Map(
    sales.filter((s) => s.source_operation_id).map((s) => [s.id, s.source_operation_id as string]),
  )
  if (saleToOp.size) {
    const { data: contracts } = await admin
      .from('sale_contracts')
      .select('id, sale_id, contract_number, status, pdf_file_name, pdf_size_bytes, pdf_mime_type, pdf_storage_path, client_visible_at, pdf_generated_at, created_at')
      .eq('agency_id', agencyId)
      .eq('client_visible', true)
      .in('sale_id', [...saleToOp.keys()])
      .limit(200)
    for (const c of (contracts ?? []) as any[]) {
      const opId = saleToOp.get(c.sale_id)
      if (!opId) continue
      const path = storagePathFromValue('sale-contracts', c.pdf_storage_path)
      if (!path) continue
      const name = String(
        c.pdf_file_name || (c.contract_number ? `Contrato ${c.contract_number}.pdf` : 'Contrato.pdf'),
      )
      if (!isAllowedDocumentFile(name, c.pdf_size_bytes)) continue
      docs.push({
        id: c.id,
        source: 'contract',
        name,
        category: 'contrato',
        trip_id: opId,
        trip_title: titleOf.get(opId) ?? null,
        available_at: c.client_visible_at ?? c.pdf_generated_at ?? c.created_at ?? null,
        file_type: c.pdf_mime_type ?? 'application/pdf',
        file_size: typeof c.pdf_size_bytes === 'number' ? c.pdf_size_bytes : null,
        status_label: CONTRACT_STATUS_LABELS[String(c.status || '').toLowerCase()] ?? null,
        bucket: 'sale-contracts',
        path,
      })
    }
  }

  return docs
}

/**
 * Carteira Digital e Roteiro vinculados à viagem. O vínculo é sempre canônico
 * (agência + cliente + viagem): nunca por coincidência de nome ou e-mail.
 * Roteiros em rascunho/revisão nunca são expostos.
 */
async function resolveTripAccess(admin: any, agencyId: string, clientId: string, operationId: string) {
  const { data: op } = await admin
    .from('operations')
    .select('id, trip_id, itinerary_id')
    .eq('id', operationId)
    .eq('user_id', agencyId)
    .eq('client_id', clientId)
    .maybeSingle()
  if (!op) return { wallet: null as null | { trip_id: string; code: string; locked: boolean }, itinerary: null as null | { code: string } }

  let wallet: null | { trip_id: string; code: string; locked: boolean } = null
  let itineraryId: string | null = op.itinerary_id ?? null

  if (op.trip_id) {
    const { data: trip } = await admin
      .from('trips')
      .select('id, public_access_code, is_locked, itinerary_id, client_id')
      .eq('id', op.trip_id)
      .eq('user_id', agencyId)
      .maybeSingle()
    if (trip?.public_access_code && (!trip.client_id || trip.client_id === clientId)) {
      wallet = { trip_id: trip.id, code: trip.public_access_code, locked: !!trip.is_locked }
      itineraryId = itineraryId ?? trip.itinerary_id ?? null
    }
  }

  let itinerary: null | { code: string } = null
  if (itineraryId) {
    const { data: row } = await admin
      .from('itineraries')
      .select('id, status, public_access_code, client_id')
      .eq('id', itineraryId)
      .eq('user_id', agencyId)
      .maybeSingle()
    if (row && (!row.client_id || row.client_id === clientId) && isPublishedItinerary(row)) {
      itinerary = { code: row.public_access_code as string }
    }
  }

  return { wallet, itinerary }
}

async function agencySlug(admin: any, agencyId: string): Promise<string> {
  const { data } = await admin.from('profiles').select('agency_name').eq('user_id', agencyId).maybeSingle()
  return agencySlugFromName(data?.agency_name)
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

    const SESSION_ACTIONS = [
      'session', 'logout', 'change_password', 'trips', 'trip',
      'documents', 'document_url', 'access_links', 'wallet_grant', 'profile',
    ]
    if (SESSION_ACTIONS.includes(action)) {
      const resolved = await resolveSession(body.token)
      if (!resolved) return json({ error: 'Sessão expirada.' }, 401)

      // Isolamento: a sessão só vale no domínio da própria agência.
      if (resolved.account.agency_id !== agencyId) {
        return json({ error: 'Sessão expirada.' }, 401)
      }

      /**
       * Minhas viagens (Etapa 3) — fonte canônica: `operations` (viagem
       * efetivamente contratada). O escopo é SEMPRE duplo e vem do servidor:
       * `user_id = agência do domínio` e `client_id = cliente da sessão`.
       * O navegador não informa agency_id nem client_id. Nenhum campo
       * financeiro, de fornecedor ou anotação interna é selecionado.
       */
      if (action === 'trips' || action === 'trip') {
        const clientId = resolved.account.client_id
        if (!clientId) return json({ trips: [] })

        let requestedId: string | null = null
        if (action === 'trip') {
          const raw = typeof body.trip_id === 'string' ? body.trip_id.trim() : ''
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
          // ID ausente/malformado: resposta genérica, sem confirmar existência.
          if (!isUuid) return json({ trip: null })
          requestedId = raw
        }

        let query = admin
          .from('operations')
          .select('id, title, destination, travel_start_date, travel_end_date, stage, passengers_count, trip_id')
          .eq('user_id', agencyId)
          .eq('client_id', clientId)
        if (requestedId) query = query.eq('id', requestedId)

        const { data: rows, error: opsError } = await query.limit(200)
        if (opsError) return json({ error: 'Não foi possível carregar suas viagens.' }, 500)

        const operations = rows ?? []
        if (action === 'trip' && operations.length === 0) return json({ trip: null })

        const ids = operations.map((o) => o.id)
        const tripIds = operations.map((o) => o.trip_id).filter(Boolean) as string[]

        const [servicesRes, coversRes, stagesRes] = await Promise.all([
          ids.length
            ? admin.from('operation_services').select('operation_id').in('operation_id', ids)
            : Promise.resolve({ data: [] as { operation_id: string }[] }),
          tripIds.length
            ? admin.from('trips').select('id, wallet_cover_url').eq('user_id', agencyId).in('id', tripIds)
            : Promise.resolve({ data: [] as { id: string; wallet_cover_url: string | null }[] }),
          admin.from('operation_pipeline_stages').select('key, name').eq('user_id', agencyId),
        ])

        const serviceCount = new Map<string, number>()
        for (const s of (servicesRes.data ?? []) as { operation_id: string }[]) {
          serviceCount.set(s.operation_id, (serviceCount.get(s.operation_id) ?? 0) + 1)
        }
        const covers = new Map<string, string | null>()
        for (const t of (coversRes.data ?? []) as { id: string; wallet_cover_url: string | null }[]) {
          covers.set(t.id, t.wallet_cover_url ?? null)
        }
        const stageNames = new Map<string, string>()
        for (const s of (stagesRes.data ?? []) as { key: string; name: string }[]) {
          stageNames.set(s.key, s.name)
        }

        const trips = operations.map((o) => ({
          id: o.id,
          title: o.title ?? null,
          destination: o.destination ?? null,
          start_date: o.travel_start_date ?? null,
          end_date: o.travel_end_date ?? null,
          stage: o.stage ?? null,
          stage_label: o.stage ? stageNames.get(o.stage) ?? null : null,
          travelers_count: typeof o.passengers_count === 'number' ? o.passengers_count : null,
          services_count: serviceCount.get(o.id) ?? 0,
          cover_url: o.trip_id ? covers.get(o.trip_id) ?? null : null,
        }))

        /**
         * Etapa 4 — detalhe completo. Serviços e viajantes só são resolvidos
         * DEPOIS de o servidor confirmar a posse (agência do domínio + cliente
         * da sessão). Nada financeiro, de fornecedor ou anotação interna sai
         * daqui: `amount`, `supplier` e `notes` nunca são selecionados e os
         * campos livres passam por uma lista de bloqueio.
         */
        if (action === 'trip') {
          const trip = trips[0]
          if (!trip) return json({ trip: null })

          const [detailServicesRes, travelersRes] = await Promise.all([
            admin
              .from('operation_services')
              .select('id, service_type, name, destination, start_date, end_date, is_confirmed, is_issued, service_data, position')
              .eq('user_id', agencyId)
              .eq('operation_id', trip.id)
              .order('position', { ascending: true })
              .limit(200),
            admin
              .from('travelers')
              .select('id, nome_completo, is_responsavel')
              .eq('user_id', agencyId)
              .eq('client_id', clientId)
              .limit(60),
          ])

          const services = (detailServicesRes.data ?? []).map((s: any) => ({
            id: s.id,
            service_type: s.service_type ?? null,
            name: s.name ?? null,
            destination: s.destination ?? null,
            start_date: s.start_date ?? null,
            end_date: s.end_date ?? null,
            confirmed: !!(s.is_confirmed || s.is_issued),
            details: safeServiceDetails(s.service_data),
          }))

          const travelers = (travelersRes.data ?? []).map((t: any) => ({
            id: t.id,
            name: t.nome_completo ?? null,
            is_responsible: !!t.is_responsavel,
          }))

          /**
           * Etapa 5 — documentos da viagem e acessos (carteira/roteiro).
           * Só disponibilidade: a autorização da carteira é criada apenas no
           * clique, em `wallet_grant`.
           */
          const [docs, access] = await Promise.all([
            collectClientDocuments(admin, agencyId, clientId, trip.id),
            resolveTripAccess(admin, agencyId, clientId, trip.id),
          ])
          const itineraryUrl = access.itinerary
            ? `https://seuroteiro.tur.br/${await agencySlug(admin, agencyId)}/${access.itinerary.code}`
            : null

          return json({
            trip: {
              ...trip,
              services,
              travelers,
              documents: docs.map(publicDoc),
              access: {
                wallet: { available: !!access.wallet, protected: !!access.wallet?.locked },
                itinerary: { available: !!access.itinerary, url: itineraryUrl },
              },
            },
          })
        }

        return json({ trips })
      }



      /** Central "Meus documentos" — somente metadados seguros. */
      if (action === 'documents') {
        const clientId = resolved.account.client_id
        if (!clientId) return json({ documents: [] })
        const docs = await collectClientDocuments(admin, agencyId, clientId)
        return json({ documents: docs.map(publicDoc) })
      }

      /**
       * Autorização de leitura de UM documento. O navegador manda apenas o id;
       * o servidor reconfere a posse listando novamente os documentos
       * autorizados e só então assina uma URL de curta duração (120s).
       */
      if (action === 'document_url') {
        const clientId = resolved.account.client_id
        const docId = typeof body.document_id === 'string' ? body.document_id.trim() : ''
        if (!clientId || !isUuid(docId)) return json({ error: 'Documento indisponível.' }, 404)

        const throttle = await checkRateLimit(originHash, 'client-area-document', 30, 60)
        if (!throttle.allowed) return json({ error: 'Muitas solicitações. Aguarde um instante.' }, 429)

        const docs = await collectClientDocuments(admin, agencyId, clientId)
        const doc = docs.find((d) => d.id === docId && (!body.source || d.source === body.source))
        if (!doc) return json({ error: 'Documento indisponível.' }, 404)

        const { data: signed, error: signError } = await admin.storage
          .from(doc.bucket)
          .createSignedUrl(doc.path, SIGNED_URL_TTL_SECONDS, { download: false })
        if (signError || !signed?.signedUrl) return json({ error: 'Documento indisponível.' }, 404)

        await logAudit(resolved.account.id, 'document_opened', { origin_hash: originHash })
        return json({
          url: signed.signedUrl,
          name: doc.name,
          file_type: doc.file_type,
          expires_in: SIGNED_URL_TTL_SECONDS,
        })
      }

      /** Disponibilidade de Carteira Digital e Roteiro de uma viagem. */
      if (action === 'access_links') {
        const clientId = resolved.account.client_id
        const tripId = typeof body.trip_id === 'string' ? body.trip_id.trim() : ''
        if (!clientId || !isUuid(tripId)) return json({ wallet: { available: false }, itinerary: { available: false } })
        const access = await resolveTripAccess(admin, agencyId, clientId, tripId)
        const itineraryUrl = access.itinerary
          ? `https://seuroteiro.tur.br/${await agencySlug(admin, agencyId)}/${access.itinerary.code}`
          : null
        return json({
          wallet: { available: !!access.wallet, protected: !!access.wallet?.locked },
          itinerary: { available: !!access.itinerary, url: itineraryUrl },
        })
      }

      /**
       * Abrir a Carteira Digital sem pedir a senha da carteira de novo.
       * Gera uma autorização de uso único, válida por 120s, ligada à conta e à
       * viagem. A senha da carteira NUNCA é lida, transportada ou exibida.
       */
      if (action === 'wallet_grant') {
        const clientId = resolved.account.client_id
        const tripId = typeof body.trip_id === 'string' ? body.trip_id.trim() : ''
        if (!clientId || !isUuid(tripId)) return json({ error: 'Carteira indisponível.' }, 404)

        const throttle = await checkRateLimit(originHash, 'client-area-wallet-grant', 20, 60)
        if (!throttle.allowed) return json({ error: 'Muitas solicitações. Aguarde um instante.' }, 429)

        const access = await resolveTripAccess(admin, agencyId, clientId, tripId)
        if (!access.wallet) return json({ error: 'Carteira indisponível.' }, 404)

        const grant = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
        const grantHash = await sha256(grant)
        const { error: grantError } = await admin.from('client_area_wallet_grants').insert({
          agency_id: agencyId,
          account_id: resolved.account.id,
          trip_id: access.wallet.trip_id,
          token_hash: grantHash,
          expires_at: new Date(Date.now() + WALLET_GRANT_TTL_MS).toISOString(),
        })
        if (grantError) return json({ error: 'Carteira indisponível.' }, 404)

        await logAudit(resolved.account.id, 'wallet_access_granted', { origin_hash: originHash })
        const slug = await agencySlug(admin, agencyId)
        return json({
          url: `https://carteiradigital.tur.br/${slug}/${access.wallet.code}?acesso=${grant}`,
          expires_in: Math.round(WALLET_GRANT_TTL_MS / 1000),
        })
      }

      /** Perfil em modo consulta — a atualização é sempre pedida à agência. */
      if (action === 'profile') {
        const clientId = resolved.account.client_id
        if (!clientId) return json({ profile: null })
        const { data: client } = await admin
          .from('clients')
          .select('nome_completo, email, telefone, cidade, estado, pais, data_nascimento')
          .eq('user_id', agencyId)
          .eq('id', clientId)
          .maybeSingle()
        return json({
          profile: {
            name: client?.nome_completo ?? null,
            email: resolved.account.email ?? client?.email ?? null,
            phone: client?.telefone ?? null,
            city: client?.cidade ?? null,
            state: client?.estado ?? null,
            country: client?.pais ?? null,
            birth_date: client?.data_nascimento ?? null,
          },
        })
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
