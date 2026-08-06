/**
 * Guardas puras compartilhadas entre `team-admin` e `admin-agency-teams`.
 *
 * Este módulo NÃO importa nada e NÃO acessa banco de dados: ele existe para que
 * as regras de segurança da gestão global de equipes sejam testáveis de verdade
 * (vitest) e usadas exatamente iguais nas duas Edge Functions.
 */

export interface GuardError {
  status: number
  error: string
}

export const SCOPE_VALUES = ['own', 'created', 'assigned', 'team', 'department', 'agency'] as const

/** UUID zero: usado em consultas `in()` vazias para nunca gerar UUID inválido. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `true` apenas para UUIDs válidos. */
export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Lista segura para consultas `in()`: nunca vazia, nunca com valor não-UUID. */
export function uuidList(values: unknown[]): string[] {
  const list = values.filter(isUuid) as string[]
  return list.length ? list : [NIL_UUID]
}

/** O ator precisa ter papel global `admin` (validado no servidor via user_roles/has_role). */
export function assertPlatformAdmin(isAdmin: boolean): GuardError | null {
  if (isAdmin) return null
  return { status: 403, error: 'Acesso restrito ao administrador da plataforma.' }
}

/** `target_agency_id` precisa ser um UUID explícito. */
export function assertTargetAgencyId(value: unknown): GuardError | null {
  if (isUuid(value)) return null
  return { status: 400, error: 'Informe a agência de destino (target_agency_id).' }
}

/** Identificadores de registro (colaborador, convite, perfil) precisam ser UUID. */
export function assertRecordId(value: unknown): GuardError | null {
  if (isUuid(value)) return null
  return { status: 400, error: 'Registro inválido.' }
}

/** A agência precisa existir e não pode ser um colaborador de outra agência. */
export function assertAgencyExists(
  agencyProfile: Record<string, unknown> | null,
  isTeamSubuser: boolean,
): GuardError | null {
  if (!agencyProfile) return { status: 404, error: 'Agência não encontrada.' }
  if (isTeamSubuser) {
    return { status: 400, error: 'O identificador informado pertence a um colaborador, não a uma agência.' }
  }
  return null
}

/** Isolamento entre agências: o alvo precisa pertencer à agência informada. */
export function assertTargetInAgency(
  targetAgencyId: string | null | undefined,
  agencyId: string,
): GuardError | null {
  if (!targetAgencyId) return { status: 404, error: 'Registro não encontrado.' }
  if (targetAgencyId !== agencyId) {
    return { status: 403, error: 'Este registro pertence a outra agência.' }
  }
  return null
}

/**
 * O proprietário/master nunca é tratado como colaborador: se o ID informado é o
 * próprio `agency_id`, a ação é recusada.
 */
export function assertNotAgencyOwner(memberId: string, agencyId: string): GuardError | null {
  if (memberId === agencyId) {
    return { status: 400, error: 'O proprietário da agência não pode ser editado como colaborador.' }
  }
  return null
}

/** Este painel nunca transfere a propriedade da agência. */
export function assertNoOwnershipTransfer(body: Record<string, unknown>): GuardError | null {
  const forbidden = ['agency_id', 'auth_user_id', 'owner_id', 'new_owner_id', 'transfer_ownership']
  const hit = forbidden.find(k => body[k] !== undefined)
  if (hit) {
    return { status: 400, error: 'Não é possível transferir a propriedade da agência por este painel.' }
  }
  return null
}

/** Mantém apenas chaves existentes no catálogo canônico (team_permission_catalog). */
export function filterPermissionKeys(requested: unknown, catalog: Set<string> | string[]): string[] {
  const set = catalog instanceof Set ? catalog : new Set(catalog)
  if (!Array.isArray(requested)) return []
  const out = new Set<string>()
  for (const k of requested) {
    const key = String(k)
    if (set.has(key)) out.add(key)
  }
  return Array.from(out)
}

/** Mantém apenas escopos válidos por módulo. */
export function filterScopes(scopes: unknown): Record<string, string> {
  if (!scopes || typeof scopes !== 'object' || Array.isArray(scopes)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(scopes as Record<string, unknown>)) {
    if ((SCOPE_VALUES as readonly string[]).includes(String(v))) out[String(k).slice(0, 60)] = String(v)
  }
  return out
}

/**
 * Perfil de acesso utilizável: nativo (global) ou da própria agência.
 * Perfis nativos nunca podem ser editados/excluídos.
 */
export function assertProfileUsable(
  profile: { id: string; agency_id: string | null; key?: string | null; is_native?: boolean } | null,
  agencyId: string,
): GuardError | null {
  if (!profile) return { status: 404, error: 'Perfil de acesso não encontrado.' }
  if (profile.key === 'owner') return { status: 400, error: 'O perfil de proprietário não pode ser atribuído.' }
  if (profile.agency_id && profile.agency_id !== agencyId) {
    return { status: 403, error: 'Este perfil de acesso pertence a outra agência.' }
  }
  return null
}

export function assertProfileEditable(
  profile: { agency_id: string | null; is_native?: boolean } | null,
  agencyId: string,
): GuardError | null {
  if (!profile) return { status: 404, error: 'Perfil de acesso não encontrado.' }
  if (profile.is_native || !profile.agency_id) {
    return { status: 400, error: 'Perfis nativos não podem ser alterados ou excluídos.' }
  }
  if (profile.agency_id !== agencyId) {
    return { status: 403, error: 'Este perfil de acesso pertence a outra agência.' }
  }
  return null
}

export interface LimitOverrideResult {
  error?: GuardError
  max_members?: number
  reason?: string
  /** Aviso quando o novo limite fica abaixo do uso atual. Nunca desativa ninguém. */
  warning?: string
}

/** Override de limite: motivo obrigatório e nunca desativa usuários existentes. */
export function validateLimitOverride(input: {
  max_members: unknown
  reason: unknown
  seatsUsed: number
}): LimitOverrideResult {
  const max = Number(input.max_members)
  if (!Number.isInteger(max) || max < 1 || max > 500) {
    return { error: { status: 400, error: 'Informe um limite inteiro entre 1 e 500.' } }
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 300) : ''
  if (reason.length < 5) {
    return { error: { status: 400, error: 'Informe o motivo do limite administrativo (mínimo de 5 caracteres).' } }
  }
  const result: LimitOverrideResult = { max_members: max, reason }
  if (max < input.seatsUsed) {
    result.warning =
      `O novo limite (${max}) é menor que os ${input.seatsUsed} acessos já em uso. ` +
      'Nenhum colaborador foi desativado: apenas novas inclusões e convites ficam bloqueados.'
  }
  return result
}

const ACTION_LABELS: Record<string, string> = {
  create_member: 'criou o colaborador',
  update_member: 'alterou as permissões do colaborador',
  set_status_active: 'reativou o colaborador',
  set_status_blocked: 'bloqueou o colaborador',
  set_status_disabled: 'desativou o colaborador',
  delete_member: 'removeu o colaborador',
  invite_created: 'criou um convite',
  invite_resent: 'reenviou um convite',
  invite_revoked: 'revogou um convite',
  access_profile_created: 'criou um perfil de acesso',
  access_profile_updated: 'alterou um perfil de acesso',
  access_profile_deleted: 'excluiu um perfil de acesso',
  community_settings_update: 'alterou as configurações de comunidade',
  team_limit_override_set: 'definiu um limite administrativo de usuários',
  team_limit_override_cleared: 'removeu o limite administrativo de usuários',
}

/** Mensagem legível em português para a auditoria. */
export function auditMessage(input: {
  action: string
  isPlatformAdmin: boolean
  subject?: string | null
  agencyName?: string | null
}): string {
  const who = input.isPlatformAdmin ? 'Administrador da plataforma' : 'Proprietário da agência'
  const verb = ACTION_LABELS[input.action] ?? `executou a ação ${input.action}`
  const subject = input.subject ? ` ${input.subject}` : ''
  const agency = input.agencyName ? ` na agência ${input.agencyName}` : ''
  return `${who} ${verb}${subject}${agency}.`
}

/** Monta o registro de auditoria, marcando explicitamente o ator global. */
export function buildAuditEntry(input: {
  agencyId: string
  actorUserId: string
  isPlatformAdmin: boolean
  action: string
  moduleKey?: string
  entityType?: string
  entityId?: string | null
  teamMemberId?: string | null
  agencyName?: string | null
  subject?: string | null
  details?: Record<string, unknown>
}): Record<string, unknown> {
  return {
    agency_id: input.agencyId,
    team_member_id: input.teamMemberId ?? null,
    actor_user_id: input.actorUserId,
    actor_is_platform_admin: input.isPlatformAdmin,
    action: input.action,
    module_key: input.moduleKey ?? 'team',
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    details: {
      ...(input.details ?? {}),
      origin: input.isPlatformAdmin ? 'admin_global' : 'agency',
      target_agency_id: input.agencyId,
      message: auditMessage({
        action: input.action,
        isPlatformAdmin: input.isPlatformAdmin,
        subject: input.subject ?? null,
        agencyName: input.agencyName ?? null,
      }),
    },
  }
}

const SECRET_FIELDS = [
  'token_hash', 'password_hash', 'password', 'service_role', 'service_role_key',
  'synthetic_email_password', 'secret',
]

/** Remove qualquer campo sensível antes de devolver dados ao navegador. */
export function sanitizeRow<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (SECRET_FIELDS.includes(k)) continue
    out[k] = v
  }
  return out as Partial<T>
}

export function sanitizeRows<T extends Record<string, unknown>>(rows: T[] | null | undefined): Partial<T>[] {
  return (rows ?? []).map(sanitizeRow)
}

/** Sanitiza e limita textos livres. */
export function safeText(v: unknown, max = 180): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (!s) return null
  return s.slice(0, max)
}