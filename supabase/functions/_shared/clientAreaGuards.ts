/**
 * Guardas puras da Área do Cliente White Label (Etapa 1).
 *
 * Este módulo NÃO importa nada e NÃO acessa banco: existe para que as regras de
 * segurança (senha, isolamento por agência, bloqueio por tentativas, auditoria
 * sem dados sensíveis) sejam testáveis de verdade e idênticas nas Edge Functions.
 *
 * Regras invioláveis:
 * - Nunca armazenar, registrar ou devolver senha em texto aberto (exceto uma
 *   única vez, na resposta da criação/redefinição feita pela agência).
 * - Nunca confiar em `agency_id` enviado pelo navegador: a agência vem do
 *   domínio (login público) ou do JWT do usuário da agência (gestão).
 */

export interface GuardError {
  status: number
  error: string
}

/** Mensagem genérica de login: nunca confirma se o e-mail existe. */
export const GENERIC_LOGIN_ERROR =
  'Não foi possível acessar. Confira os dados informados ou solicite um novo acesso à sua agência.'

/** Mensagem genérica de recuperação: nunca confirma se o e-mail existe. */
export const GENERIC_RECOVERY_MESSAGE =
  'Se os dados estiverem corretos, você receberá as orientações de acesso. Você também pode solicitar uma nova senha à sua agência.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

export function isValidEmail(raw: unknown): boolean {
  const email = normalizeEmail(raw)
  return email.length <= 254 && EMAIL_RE.test(email)
}

// ─────────────────────────────────────────────────────────────
// Senhas
// ─────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72 // limite do bcrypt

/** Senhas obviamente inseguras — recusadas mesmo quando a agência as define. */
const OBVIOUS_PASSWORDS = [
  '12345678', '123456789', '1234567890', '11111111', '00000000', 'password',
  'senha123', 'senha1234', 'agencia123', 'qwertyui', 'abcd1234', 'admin123',
  'cliente123', 'viagem123', '123123123', 'aaaaaaaa', 'password1', '12341234',
]

export function isObviousPassword(password: string): boolean {
  const p = String(password ?? '').trim().toLowerCase()
  if (!p) return true
  if (OBVIOUS_PASSWORDS.includes(p)) return true
  if (/^(.)\1+$/.test(p)) return true
  if (/^0?123456/.test(p)) return true
  return false
}

/** Valida a senha escolhida pela agência ou pelo cliente. */
export function validatePassword(password: unknown): GuardError | null {
  const value = typeof password === 'string' ? password : ''
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { status: 400, error: `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return { status: 400, error: `A senha precisa ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.` }
  }
  if (/^\s|\s$/.test(value)) {
    return { status: 400, error: 'A senha não pode começar ou terminar com espaço.' }
  }
  if (isObviousPassword(value)) {
    return { status: 400, error: 'Escolha uma senha menos previsível.' }
  }
  return null
}

/** Palavras neutras (sem dados pessoais) para senhas fáceis de digitar. */
const WORDS_A = [
  'Sol', 'Mar', 'Lua', 'Rio', 'Vila', 'Serra', 'Porto', 'Campo', 'Vale', 'Duna',
  'Cais', 'Farol', 'Norte', 'Sul', 'Leste', 'Oeste', 'Trilha', 'Ilha',
]
const WORDS_B = [
  'Praia', 'Cume', 'Viagem', 'Roteiro', 'Destino', 'Lago', 'Baia', 'Trilho',
  'Aurora', 'Areia', 'Coral', 'Bosque', 'Cristal', 'Horizonte', 'Estrada',
]

/**
 * Senha gerada de forma criptograficamente segura (nunca Math.random) e sem
 * qualquer relação com dados pessoais do cliente.
 * Formato: Palavra-Palavra-4 dígitos (ex.: Mar-Coral-4827).
 */
export function generateSecurePassword(
  randomBytes: (size: number) => Uint8Array,
): string {
  const bytes = randomBytes(8)
  const pick = <T,>(list: T[], byte: number): T => list[byte % list.length]
  const digits = ((bytes[2] << 16 | bytes[3] << 8 | bytes[4]) % 9000) + 1000
  return `${pick(WORDS_A, bytes[0])}-${pick(WORDS_B, bytes[1])}-${digits}`
}

// ─────────────────────────────────────────────────────────────
// Tentativas de login / bloqueio temporário
// ─────────────────────────────────────────────────────────────

export const MAX_LOGIN_ATTEMPTS = 6
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export interface AttemptRow {
  attempts: number
  first_attempt_at: string | null
  locked_until: string | null
}

/** `true` quando o par (agência, e-mail) está em bloqueio temporário. */
export function isLockedOut(row: AttemptRow | null, now = Date.now()): boolean {
  if (!row?.locked_until) return false
  return new Date(row.locked_until).getTime() > now
}

/** Novo estado de tentativas após uma falha. */
export function nextAttemptState(
  row: AttemptRow | null,
  now = Date.now(),
): { attempts: number; first_attempt_at: string; locked_until: string | null } {
  const firstAt = row?.first_attempt_at ? new Date(row.first_attempt_at).getTime() : 0
  const withinWindow = firstAt > 0 && now - firstAt <= ATTEMPT_WINDOW_MS
  const attempts = (withinWindow ? row?.attempts ?? 0 : 0) + 1
  const lockMinutes = attempts >= MAX_LOGIN_ATTEMPTS
    ? Math.min(5 * Math.floor(attempts / MAX_LOGIN_ATTEMPTS), 30)
    : 0
  return {
    attempts,
    first_attempt_at: new Date(withinWindow ? firstAt : now).toISOString(),
    locked_until: lockMinutes > 0 ? new Date(now + lockMinutes * 60 * 1000).toISOString() : null,
  }
}

// ─────────────────────────────────────────────────────────────
// Isolamento multiagência
// ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * O registro alvo precisa pertencer à agência do ator. IDs vindos do navegador
 * nunca são suficientes: a agência é sempre resolvida no servidor.
 */
export function assertSameAgency(
  targetAgencyId: string | null | undefined,
  actorAgencyId: string | null | undefined,
): GuardError | null {
  if (!isUuid(actorAgencyId)) return { status: 403, error: 'Acesso negado.' }
  if (!targetAgencyId) return { status: 404, error: 'Registro não encontrado.' }
  if (targetAgencyId !== actorAgencyId) {
    return { status: 403, error: 'Este registro pertence a outra agência.' }
  }
  return null
}

/** Elegibilidade + permissão, validadas no servidor (nunca só na interface). */
export function assertCanManageAccess(ctx: {
  authenticated?: boolean
  white_label_active?: boolean
  can_manage?: boolean
} | null): GuardError | null {
  if (!ctx?.authenticated) return { status: 401, error: 'Sessão expirada. Entre novamente.' }
  if (!ctx.white_label_active) {
    return { status: 403, error: 'A Área do Cliente está disponível apenas para agências com site White Label ativo.' }
  }
  if (!ctx.can_manage) {
    return { status: 403, error: 'Você não possui permissão para gerenciar o acesso do cliente.' }
  }
  return null
}

/** O cliente precisa de e-mail válido para receber acesso. */
export function assertClientCanHaveAccess(client: { email?: string | null } | null): GuardError | null {
  if (!client) return { status: 404, error: 'Cliente não encontrado.' }
  if (!isValidEmail(client.email)) {
    return { status: 400, error: 'Cadastre um e-mail válido para criar o acesso do cliente.' }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Auditoria
// ─────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  'account_created', 'password_reset_by_agency', 'account_blocked', 'account_unblocked',
  'first_login', 'login_success', 'login_throttled', 'password_changed_by_client',
  'logout', 'recovery_requested',
] as const

const FORBIDDEN_AUDIT_KEYS = [
  'password', 'senha', 'password_hash', 'hash', 'token', 'token_hash', 'link',
  'message', 'mensagem', 'secret', 'initial_password', 'senha_inicial',
]

/** Remove qualquer campo sensível antes de gravar auditoria. */
export function sanitizeAuditDetails(details: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(details ?? {})) {
    const key = k.toLowerCase()
    if (FORBIDDEN_AUDIT_KEYS.some((f) => key === f || key.includes(f))) continue
    if (typeof v === 'string' && v.length > 200) continue
    out[k] = v
  }
  return out
}

/** Payload de conta devolvido ao navegador — sem hash, sem senha, sem token. */
export function publicAccountView(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null
  const allowed = [
    'id', 'status', 'email_normalized', 'first_login_at', 'last_login_at',
    'login_count', 'password_updated_at', 'password_set_by', 'created_at',
  ]
  const out: Record<string, unknown> = {}
  for (const key of allowed) if (key in row) out[key] = row[key]
  return out
}
