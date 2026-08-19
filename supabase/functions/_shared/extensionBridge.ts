/**
 * Guardas e normalizações puras da ponte autenticada da extensão Chrome
 * ("Agente de Sonhos para WhatsApp").
 *
 * Este módulo NÃO importa nada e NÃO acessa banco: existe para que as regras de
 * validação e de movimentação de etapa sejam testáveis (vitest) e usadas
 * exatamente iguais na Edge Function `browser-extension-api`.
 */

export interface BridgeError {
  status: number
  error: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}

export const ACTIONS = [
  'context',
  'lookup_contact',
  'search_contacts',
  'create_contact',
  'list_opportunities',
  'get_pipeline_stages',
  'create_opportunity',
  'update_opportunity_stage',
  'register_budget_sent',
  'create_followup',
  // ── versão 0.4 ────────────────────────────────────────────────────────────
  'dashboard_today',
  'get_contact_summary',
  'update_opportunity',
  'list_followups',
  'update_followup',
  'complete_followup',
  'list_companies',
  'search_companies',
  'create_company',
  'link_contact_company',
  'unlink_contact_company',
  'list_contact_companies',
  'list_opportunity_quotes',
  'list_opportunity_operations',
] as const

export type BridgeAction = typeof ACTIONS[number]

export function assertAction(value: unknown): BridgeError | null {
  if (typeof value === 'string' && (ACTIONS as readonly string[]).includes(value)) return null
  return { status: 400, error: 'Ação não reconhecida.' }
}

/** Remove tudo que não é dígito. Nunca retorna `null`. */
export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).replace(/[^0-9]/g, '')
}

/**
 * Telefone utilizável para busca/gravação: entre 8 e 15 dígitos (E.164).
 * Abaixo disso é ruído do WhatsApp (ex.: números de grupo truncados).
 */
export function isUsablePhone(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15
}

/** Texto seguro: colapsa espaços, remove tags e corta no limite. */
export function safeText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s{2,}/g, ' ')
    .slice(0, max)
}

export interface NameResult { valid: true; value: string } 

export function validateName(value: unknown): { valid: true; value: string } | { valid: false; error: BridgeError } {
  const name = safeText(value, 120)
  if (name.length < 2) return { valid: false, error: { status: 400, error: 'Informe o nome do contato (mínimo de 2 caracteres).' } }
  return { valid: true, value: name }
}

export function validateDestination(value: unknown): { valid: true; value: string } | { valid: false; error: BridgeError } {
  const destination = safeText(value, 160)
  if (destination.length < 2) return { valid: false, error: { status: 400, error: 'Informe o destino da oportunidade.' } }
  return { valid: true, value: destination }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Data ISO simples (YYYY-MM-DD) e realmente existente no calendário. */
export function validateIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null
  return value
}

/** Inteiro dentro de faixa; `fallback` quando ausente/inválido. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** Valor monetário não negativo, limitado para evitar overflow numérico. */
export function safeAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 99_999_999)
}

/** Aceita apenas URL http/https. Qualquer outro esquema é descartado. */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().slice(0, 600)
  if (!/^https?:\/\/[^\s]+$/i.test(raw)) return null
  return raw
}

export interface StagePermissionRow {
  stage_id: string
  can_view?: boolean
  can_edit?: boolean
  can_move?: boolean
}

/**
 * Guarda de movimentação de etapa.
 * - Master (proprietário) sempre pode mover.
 * - Colaborador precisa de `can_move = true` EXPLÍCITO na etapa de origem e na
 *   de destino. Ausência de registro = negado (fail-closed).
 */
export function assertCanMoveStage(input: {
  isTeamMember: boolean
  fromStageId: string | null
  toStageId: string
  permissions: StagePermissionRow[]
}): BridgeError | null {
  if (!isUuid(input.toStageId)) return { status: 400, error: 'Etapa de destino inválida.' }
  if (!input.isTeamMember) return null
  const byStage = new Map(input.permissions.map(p => [p.stage_id, p]))
  const ids = [input.toStageId, ...(input.fromStageId ? [input.fromStageId] : [])]
  for (const id of ids) {
    if (byStage.get(id)?.can_move !== true) {
      return { status: 403, error: 'Você não possui permissão para mover a oportunidade entre estas etapas.' }
    }
  }
  return null
}

/** Etapas visíveis: master vê todas; colaborador só as com `can_view`. */
export function filterVisibleStages<T extends { id: string }>(
  stages: T[],
  isTeamMember: boolean,
  permissions: StagePermissionRow[],
): (T & { can_view: boolean; can_edit: boolean; can_move: boolean })[] {
  const byStage = new Map(permissions.map(p => [p.stage_id, p]))
  return stages
    .map(s => {
      const p = byStage.get(s.id)
      return {
        ...s,
        can_view: isTeamMember ? p?.can_view === true : true,
        can_edit: isTeamMember ? p?.can_edit === true : true,
        can_move: isTeamMember ? p?.can_move === true : true,
      }
    })
    .filter(s => s.can_view)
}

/** Nota curta e determinística registrada ao enviar orçamento pelo WhatsApp. */
export function budgetSentNote(url: string | null): string {
  return url
    ? `Orçamento enviado pelo WhatsApp. Link: ${url}`
    : 'Orçamento enviado pelo WhatsApp.'
}

/** Contato devolvido à extensão: apenas campos mínimos, sem dados sensíveis. */
export function publicContact(row: Record<string, unknown> | null) {
  if (!row) return null
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    status: (row.status as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  }
}

/**
 * Escapa curingas do LIKE/ILIKE (`%`, `_`, `\`) para que o texto digitado seja
 * tratado como literal. A busca parcial é montada por nós (`%termo%`).
 */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, m => `\\${m}`)
}

/** Padrão de busca parcial case-insensitive, com curingas escapados. */
export function ilikeContainsPattern(value: string): string {
  return `%${escapeIlike(value)}%`
}

/**
 * Variantes exatas e seguras de um telefone normalizado, para comparar com
 * `clients.phone_normalized`. O CRM pode ter salvo DDD+número (10/11 dígitos)
 * enquanto o WhatsApp entrega 55+DDD+número (12/13 dígitos).
 *
 * Regras (conservadoras, sem inventar variantes de outros países):
 * - o próprio número, quando utilizável (8–15 dígitos);
 * - 10/11 dígitos → também `55` + número;
 * - 12/13 dígitos começando por `55` → também a versão sem o `55`.
 */
export function phoneMatchVariants(digits: string): string[] {
  if (!isUsablePhone(digits)) return []
  const out = [digits]
  const push = (v: string) => {
    if (isUsablePhone(v) && !out.includes(v)) out.push(v)
  }
  if (digits.length === 10 || digits.length === 11) {
    push(`55${digits}`)
  } else if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    push(digits.slice(2))
  }
  return out
}

/**
 * Une resultados de telefone (correspondência exata, primeiro) e de nome,
 * deduplicando por `id` e limitando a quantidade devolvida.
 */
export function mergeContactMatches(
  phoneRows: Record<string, unknown>[] | null | undefined,
  nameRows: Record<string, unknown>[] | null | undefined,
  limit = 10,
): Record<string, unknown>[] {
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  for (const row of [...(phoneRows ?? []), ...(nameRows ?? [])]) {
    const id = row?.id as string | undefined
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

/** Oportunidade devolvida à extensão: apenas campos mínimos. */
export function publicOpportunity(row: Record<string, unknown>) {
  const stage = (row.pipeline_stage ?? null) as Record<string, unknown> | null
  return {
    id: row.id as string,
    destination: (row.destination as string) ?? '',
    stage_id: (row.stage_id as string) ?? null,
    stage_name: (stage?.name as string) ?? (row.stage as string) ?? null,
    stage_legacy_key: (stage?.legacy_key as string) ?? (row.stage as string) ?? null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    passengers_count: (row.passengers_count as number) ?? null,
    estimated_value: (row.estimated_value as number) ?? null,
    follow_up_date: (row.follow_up_date as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vínculo triplo do colaborador (usado com o service client administrativo)
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamMemberBindingRow {
  id: unknown
  auth_user_id: unknown
  agency_id: unknown
  status?: unknown
}

/**
 * Valida, fail-closed, que existe EXATAMENTE UM colaborador ativo cujo
 * `id`, `auth_user_id` e `agency_id` correspondem ao trio derivado no servidor.
 * Qualquer divergência (nenhum, mais de um, inativo, agência ou usuário
 * diferente) resulta em 403.
 */
export function assertTeamMembershipBinding(input: {
  rows: TeamMemberBindingRow[] | null | undefined
  teamMemberId: string
  authUserId: string
  agencyId: string
}): BridgeError | null {
  const denied: BridgeError = { status: 403, error: 'Vínculo de colaborador inválido para esta agência.' }
  if (!isUuid(input.teamMemberId) || !isUuid(input.authUserId) || !isUuid(input.agencyId)) return denied
  const rows = input.rows
  if (!Array.isArray(rows) || rows.length !== 1) return denied
  const row = rows[0]
  if (row.id !== input.teamMemberId) return denied
  if (row.auth_user_id !== input.authUserId) return denied
  if (row.agency_id !== input.agencyId) return denied
  if (row.status !== undefined && row.status !== 'active') return denied
  return null
}

/**
 * Filtro obrigatório das leituras de permissões: sempre `agency_id` E
 * `team_member_id` derivados no servidor. Nunca aceita IDs do body.
 */
export function teamPermissionFilter(agencyId: string, teamMemberId: string): {
  agency_id: string
  team_member_id: string
} {
  if (!isUuid(agencyId) || !isUuid(teamMemberId)) {
    throw new Error('teamPermissionFilter exige agencyId e teamMemberId válidos.')
  }
  return { agency_id: agencyId, team_member_id: teamMemberId }
}

/**
 * Leitura de permissões nunca pode degradar para array vazio silencioso: erro
 * de banco é negação explícita.
 */
export function assertPermissionReadOk(...errors: (unknown | null | undefined)[]): BridgeError | null {
  if (errors.some(e => !!e)) {
    return { status: 403, error: 'Não foi possível validar suas permissões. Tente novamente.' }
  }
  return null
}

// ═════════════════════════════════════════════════════════════════════════════
// Versão 0.4 — helpers puros de fuso, limites, empresas e deep links
// ═════════════════════════════════════════════════════════════════════════════

/** Fuso civil padrão da plataforma quando o cliente não envia um válido. */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

/**
 * Base segura do app para deep links. NUNCA é lida do body da requisição:
 * uma URL enviada pelo cliente poderia induzir o usuário a um domínio hostil.
 */
export const APP_BASE_URL = 'https://app.agentesdesonhos.com.br'

/** Valida um identificador IANA de fuso; qualquer coisa inválida cai no default. */
export function validateTimeZone(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_TIME_ZONE
  const tz = value.trim().slice(0, 64)
  if (!/^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+)*$/.test(tz)) return DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

/**
 * ISO 8601 com offset explícito (`Z` ou `±HH:MM`).
 * Recusa datetime "flutuante" (sem offset), que seria ambíguo entre fusos.
 */
const ISO_OFFSET_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/

export function validateIsoDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!ISO_OFFSET_RE.test(raw)) return null
  const ms = Date.parse(raw.replace(' ', 'T'))
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

function tzParts(instantMs: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const out: Record<string, string> = {}
  for (const p of fmt.formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') out[p.type] = p.value
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour === '24' ? '0' : out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  }
}

function tzOffsetMs(instantMs: number, timeZone: string): number {
  const p = tzParts(instantMs, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instantMs / 1000) * 1000
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * Data civil (YYYY-MM-DD) de um instante dentro de um fuso.
 * NÃO usa `toISOString().split('T')`, que muda o dia fora do UTC.
 */
export function civilDateInTimeZone(instant: string | number | Date, timeZone: string): string {
  const tz = validateTimeZone(timeZone)
  const ms = instant instanceof Date ? instant.getTime()
    : typeof instant === 'number' ? instant
    : Date.parse(instant)
  if (!Number.isFinite(ms)) return ''
  const p = tzParts(ms, tz)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

/** Hora civil (HH:MM) de um instante dentro de um fuso. */
export function civilTimeInTimeZone(instant: string | number | Date, timeZone: string): string {
  const tz = validateTimeZone(timeZone)
  const ms = instant instanceof Date ? instant.getTime()
    : typeof instant === 'number' ? instant
    : Date.parse(instant)
  if (!Number.isFinite(ms)) return ''
  const p = tzParts(ms, tz)
  return `${pad2(p.hour)}:${pad2(p.minute)}`
}

/** Instante UTC correspondente a uma data/hora civil de um fuso. */
export function zonedCivilToUtcIso(dateStr: string, timeStr: string, timeZone: string): string {
  const tz = validateTimeZone(timeZone)
  const naive = Date.parse(`${dateStr}T${timeStr}Z`)
  if (!Number.isFinite(naive)) return ''
  const first = tzOffsetMs(naive, tz)
  let utc = naive - first
  const second = tzOffsetMs(utc, tz)
  if (second !== first) utc = naive - second
  return new Date(utc).toISOString()
}

export interface CivilDayWindow {
  time_zone: string
  today: string
  start_utc: string
  end_utc: string
  horizon_date: string
  horizon_end_utc: string
}

/**
 * Janela do dia civil (e horizonte de N dias) no fuso informado, para o painel
 * "Hoje". Tudo derivado do fuso validado — nunca de um split simples em UTC.
 */
export function civilDayWindow(timeZone: unknown, horizonDays = 7, now: Date = new Date()): CivilDayWindow {
  const tz = validateTimeZone(timeZone)
  const today = civilDateInTimeZone(now, tz)
  const [y, m, d] = today.split('-').map(Number)
  const horizon = new Date(Date.UTC(y, m - 1, d + Math.max(1, Math.min(60, horizonDays))))
  const horizonDate = `${horizon.getUTCFullYear()}-${pad2(horizon.getUTCMonth() + 1)}-${pad2(horizon.getUTCDate())}`
  return {
    time_zone: tz,
    today,
    start_utc: zonedCivilToUtcIso(today, '00:00:00', tz),
    end_utc: zonedCivilToUtcIso(today, '23:59:59', tz),
    horizon_date: horizonDate,
    horizon_end_utc: zonedCivilToUtcIso(horizonDate, '23:59:59', tz),
  }
}

/** Limite de paginação seguro para as coleções devolvidas à extensão. */
export function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return Math.min(fallback, max)
  return Math.min(Math.trunc(n), max)
}

export const FOLLOWUP_FILTERS = ['overdue', 'today', 'upcoming', 'all'] as const
export type FollowupFilter = typeof FOLLOWUP_FILTERS[number]

export function validateFollowupFilter(value: unknown): FollowupFilter {
  return typeof value === 'string' && (FOLLOWUP_FILTERS as readonly string[]).includes(value)
    ? value as FollowupFilter
    : 'today'
}

export const RELATIONSHIP_TYPES = ['employee', 'owner', 'buyer', 'traveler', 'other'] as const

export function validateRelationshipType(value: unknown): string {
  return typeof value === 'string' && (RELATIONSHIP_TYPES as readonly string[]).includes(value)
    ? value
    : 'employee'
}

export const TRAVEL_CONTEXTS = ['personal', 'corporate'] as const

export function validateTravelContext(value: unknown): 'personal' | 'corporate' | null {
  return value === 'personal' || value === 'corporate' ? value : null
}

/**
 * Contexto de viagem coerente com a empresa: corporativo exige empresa,
 * pessoal proíbe. Espelha a constraint do banco para dar erro amigável antes.
 */
export function assertTravelContextPair(
  context: 'personal' | 'corporate',
  companyId: string | null,
): BridgeError | null {
  if (context === 'corporate' && !companyId) {
    return { status: 400, error: 'Viagem corporativa exige uma empresa vinculada.' }
  }
  if (context === 'personal' && companyId) {
    return { status: 400, error: 'Viagem pessoal não aceita empresa vinculada.' }
  }
  return null
}

/** CNPJ nunca sai bruto: apenas indicação mascarada com os 4 últimos dígitos. */
export function maskDocument(value: unknown): string | null {
  const digits = normalizePhone(value)
  if (digits.length < 4) return null
  return `••••${digits.slice(-4)}`
}

// ── Deep links calculados no servidor ────────────────────────────────────────

export function clientDeepLink(clientId: string): string | null {
  return isUuid(clientId) ? `${APP_BASE_URL}/gestao-clientes/clientes?client=${clientId}` : null
}

export function opportunityDeepLink(opportunityId: string): string | null {
  return isUuid(opportunityId) ? `${APP_BASE_URL}/gestao-clientes/funil?opportunity=${opportunityId}` : null
}

export function createQuoteDeepLink(opportunityId: string): string | null {
  return isUuid(opportunityId)
    ? `${APP_BASE_URL}/ferramentas-ia/gerar-orcamento?opportunity=${opportunityId}`
    : null
}

export function agendaDeepLink(date?: string | null): string {
  const iso = validateIsoDate(date)
  return iso ? `${APP_BASE_URL}/agenda?date=${iso}` : `${APP_BASE_URL}/agenda`
}

// ── Serializadores de payload mínimo ────────────────────────────────────────

/** Empresa devolvida à extensão: sem CNPJ bruto. */
export function publicCompany(row: Record<string, unknown> | null) {
  if (!row) return null
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    trade_name: (row.trade_name as string) ?? null,
    cnpj_masked: maskDocument(row.cnpj_normalized),
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  }
}

export function publicClientCompany(row: Record<string, unknown>) {
  const company = (row.company ?? null) as Record<string, unknown> | null
  return {
    id: row.id as string,
    client_id: (row.client_id as string) ?? null,
    company_id: (row.company_id as string) ?? null,
    relationship_type: (row.relationship_type as string) ?? null,
    is_primary: row.is_primary === true,
    company: publicCompany(company),
  }
}

/** Follow-up devolvido à extensão, com horário quando existir. */
export function publicFollowup(row: Record<string, unknown>) {
  const opp = (row.opportunity ?? null) as Record<string, unknown> | null
  const client = (opp?.client ?? null) as Record<string, unknown> | null
  return {
    id: row.id as string,
    opportunity_id: (row.opportunity_id as string) ?? null,
    follow_up_date: (row.follow_up_date as string) ?? null,
    follow_up_at: (row.follow_up_at as string) ?? null,
    time_zone: (row.time_zone as string) ?? null,
    all_day: !row.follow_up_at,
    note: (row.note as string) ?? null,
    created_at: (row.created_at as string) ?? null,
    destination: (opp?.destination as string) ?? null,
    client_id: (opp?.client_id as string) ?? null,
    client_name: (client?.name as string) ?? null,
    opportunity_url: opportunityDeepLink((row.opportunity_id as string) ?? ''),
  }
}

/** Evento de agenda devolvido à extensão. */
export function publicAgendaEvent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    event_type: (row.event_type as string) ?? null,
    event_date: (row.event_date as string) ?? null,
    event_time: (row.event_time as string) ?? null,
    start_at: (row.start_at as string) ?? null,
    time_zone: (row.time_zone as string) ?? null,
    all_day: row.all_day === true || !row.event_time,
    agenda_url: agendaDeepLink((row.event_date as string) ?? null),
  }
}

/** Operação/viagem: nada financeiro (sale_amount, pagamentos) sai daqui. */
export function publicOperation(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    destination: (row.destination as string) ?? null,
    travel_start_date: (row.travel_start_date as string) ?? null,
    travel_end_date: (row.travel_end_date as string) ?? null,
    passengers_count: (row.passengers_count as number) ?? null,
    stage: (row.stage as string) ?? null,
  }
}

export function publicTrip(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    trip_title: (row.trip_title as string) ?? null,
    destination: (row.destination as string) ?? null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    status: (row.status as string) ?? null,
  }
}

export function publicQuote(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    trip_title: (row.trip_title as string) ?? null,
    destination: (row.destination as string) ?? null,
    status: (row.status as string) ?? null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  }
}

export function publicOpportunityNote(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    content: safeText(row.content, 500),
    created_at: (row.created_at as string) ?? null,
  }
}

export function publicOpportunityHistory(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    from_stage: (row.from_stage as string) ?? null,
    to_stage: (row.to_stage as string) ?? null,
    // `opportunity_history` usa `changed_at` como marca temporal.
    changed_at: (row.changed_at as string) ?? null,
  }
}

/**
 * Campos de atualização de oportunidade aceitos pela extensão.
 * Somente colunas REAIS da tabela `opportunities`.
 */
export function buildOpportunityUpdate(body: Record<string, unknown>): {
  patch: Record<string, unknown>
  error: BridgeError | null
} {
  const patch: Record<string, unknown> = {}

  if ('destination' in body) {
    const check = validateDestination(body.destination)
    if (check.valid === false) return { patch: {}, error: check.error }
    patch.destination = check.value
  }
  if ('startDate' in body) patch.start_date = validateIsoDate(body.startDate)
  if ('endDate' in body) patch.end_date = validateIsoDate(body.endDate)
  if ('notes' in body) patch.notes = safeText(body.notes, 2000) || null
  if ('estimatedValue' in body) patch.estimated_value = safeAmount(body.estimatedValue)

  const hasAdults = 'adultsCount' in body
  const hasChildren = 'childrenCount' in body
  if (hasAdults) patch.adults_count = clampInt(body.adultsCount, 0, 99, 1)
  if (hasChildren) patch.children_count = clampInt(body.childrenCount, 0, 99, 0)
  if ('passengersCount' in body || hasAdults || hasChildren) {
    const a = hasAdults ? (patch.adults_count as number) : 0
    const c = hasChildren ? (patch.children_count as number) : 0
    patch.passengers_count = clampInt(body.passengersCount, 1, 199, Math.max(1, a + c))
  }

  if ('travelContext' in body || 'companyId' in body) {
    const context = validateTravelContext(body.travelContext)
    if (!context) return { patch: {}, error: { status: 400, error: 'Contexto de viagem inválido (personal ou corporate).' } }
    const companyId = isUuid(body.companyId) ? (body.companyId as string) : null
    const pairError = assertTravelContextPair(context, companyId)
    if (pairError) return { patch: {}, error: pairError }
    patch.travel_context = context
    patch.company_id = companyId
  }

  if (Object.keys(patch).length === 0) {
    return { patch: {}, error: { status: 400, error: 'Nenhum campo válido para atualizar.' } }
  }
  return { patch, error: null }
}
