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
