/**
 * Guardas puras da Área do Cliente White Label (Etapa 1.1).
 *
 * Este módulo NÃO importa nada e NÃO acessa banco: existe para que as regras de
 * segurança (senha, isolamento por agência, bloqueio por tentativas, sessão,
 * CORS, auditoria sem dados sensíveis) sejam testáveis de verdade e idênticas
 * nas Edge Functions.
 *
 * Regras invioláveis:
 * - Nunca armazenar, registrar ou devolver senha em texto aberto (exceto uma
 *   única vez, na resposta da criação/redefinição feita pela agência).
 * - Nunca confiar em `agency_id` enviado pelo navegador: a agência vem do
 *   domínio (login público) ou do JWT do usuário da agência (gestão).
 * - Nunca aceitar ação pública sem hostname White Label válido e ativo.
 */

export interface GuardError {
  status: number
  error: string
}

/** Mensagem genérica de login: nunca confirma se o e-mail existe. */
export const GENERIC_LOGIN_ERROR =
  'Não foi possível acessar. Confira os dados informados ou solicite um novo acesso à sua agência.'

/**
 * Mensagem genérica de recuperação. Nesta etapa NÃO existe envio automático de
 * e-mail: o texto orienta o cliente a falar com a agência e nunca promete envio.
 */
export const GENERIC_RECOVERY_MESSAGE =
  'Registramos sua solicitação. Nesta etapa a nova senha é gerada pela própria agência: fale com o atendimento para receber um novo acesso.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

export function isValidEmail(raw: unknown): boolean {
  const email = normalizeEmail(raw)
  return email.length <= 254 && EMAIL_RE.test(email)
}

// ─────────────────────────────────────────────────────────────
// Hostname / origem
// ─────────────────────────────────────────────────────────────

export function normalizeHost(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
}

/** Host do header Origin (ou string vazia quando ausente/ inválido). */
export function hostFromOrigin(origin: unknown): string {
  const raw = String(origin ?? '').trim()
  if (!raw || raw === 'null') return ''
  return normalizeHost(raw)
}

/** Hosts/prefixos da própria plataforma (app, previews e desenvolvimento). */
const PLATFORM_HOST_SUFFIXES = [
  'agentesdesonhos.com.br',
  'agentedesonhos.com.br',
  'lovable.app',
  'lovableproject.com',
  'lovableproject-dev.com',
  'lovable.dev',
]

export function isPlatformOriginHost(host: string): boolean {
  const h = normalizeHost(host)
  if (!h) return false
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true
  return PLATFORM_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
}

/**
 * Origem permitida para uma ação pública: precisa ser o próprio domínio White
 * Label da agência ou um ambiente autorizado da plataforma (app/prévia/dev).
 * Retorna a origem a ecoar em `Access-Control-Allow-Origin`, ou `null` quando
 * a origem não é aceitável. Requisições sem Origin (não-navegador) devolvem '*'.
 */
export function resolveAllowedOrigin(
  origin: string | null | undefined,
  agencyHostname?: string | null,
): string | null {
  const raw = String(origin ?? '').trim()
  if (!raw || raw === 'null') return '*'
  const host = hostFromOrigin(raw)
  if (!host) return null
  const agency = normalizeHost(agencyHostname)
  if (agency && host === agency) return raw
  if (isPlatformOriginHost(host)) return raw
  return null
}

/**
 * A origem do navegador precisa corresponder ao domínio informado. Ambientes da
 * plataforma (prévia/app/dev) são aceitos para permitir homologação.
 */
export function assertOriginMatchesHost(
  origin: string | null | undefined,
  hostname: string,
): GuardError | null {
  const host = hostFromOrigin(origin)
  if (!host) return null // sem Origin: não é navegador; hostname já é validado no servidor
  if (host === normalizeHost(hostname)) return null
  if (isPlatformOriginHost(host)) return null
  return { status: 403, error: 'Origem não autorizada para este domínio.' }
}

/** Toda ação pública exige um hostname explícito. Ausência nunca é aceita. */
export function assertHostnamePresent(raw: unknown): GuardError | null {
  const host = normalizeHost(raw)
  if (!host || !host.includes('.') && host !== 'localhost') {
    return { status: 400, error: 'Não foi possível identificar o site da agência.' }
  }
  return null
}

/** Contexto de domínio devolvido pelo RPC `client_area_domain_context`. */
export interface DomainContext {
  ok?: boolean
  reason?: string
  hostname?: string
  agency_id?: string
  agency_slug?: string | null
  agency_name?: string | null
  whatsapp?: string | null
}

/**
 * Valida o contexto do domínio. A elegibilidade White Label é decidida no
 * banco pela regra canônica da plataforma (plano + domínio ativo).
 */
export function assertDomainContext(ctx: DomainContext | null): GuardError | null {
  if (!ctx?.ok || !isUuid(ctx.agency_id)) {
    return { status: 403, error: 'Este endereço não possui Área do Cliente ativa.' }
  }
  return null
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

/**
 * Palavras neutras (128), sem acentos, sem qualquer dado pessoal e fáceis de
 * ditar/digitar. O tamanho exato (potência de 2) evita viés na seleção.
 */
export const PASSWORD_WORDS = [
  'sol', 'mar', 'lua', 'rio', 'vila', 'serra', 'porto', 'campo',
  'vale', 'duna', 'cais', 'farol', 'norte', 'sul', 'leste', 'oeste',
  'trilha', 'ilha', 'praia', 'cume', 'viagem', 'roteiro', 'destino', 'lago',
  'baia', 'trilho', 'aurora', 'areia', 'coral', 'bosque', 'cristal', 'horizonte',
  'estrada', 'ponte', 'vento', 'chuva', 'neve', 'nuvem', 'brisa', 'mare',
  'pedra', 'granito', 'marmore', 'ambar', 'jade', 'opala', 'topazio', 'rubi',
  'safira', 'perola', 'bambu', 'cedro', 'pinheiro', 'palmeira', 'cacau', 'canela',
  'cravo', 'menta', 'lavanda', 'jasmim', 'girassol', 'orquidea', 'tulipa', 'violeta',
  'magnolia', 'alfazema', 'samambaia', 'musgo', 'liquen', 'junco', 'albatroz', 'andorinha',
  'gaivota', 'garca', 'tucano', 'arara', 'colibri', 'falcao', 'coruja', 'cegonha',
  'baleia', 'tartaruga', 'golfinho', 'estrela', 'concha', 'ostra', 'alga', 'recife',
  'atol', 'laguna', 'canyon', 'planalto', 'savana', 'tundra', 'oasis', 'deserto',
  'geleira', 'vulcao', 'cratera', 'caverna', 'bussola', 'mapa', 'ancora', 'vela',
  'remo', 'quilha', 'mastro', 'proa', 'popa', 'casco', 'lanterna', 'tocha',
  'chama', 'faisca', 'brasa', 'fogueira', 'relogio', 'sino', 'arco', 'torre',
  'muro', 'patio', 'praca', 'jardim', 'pomar', 'moinho', 'celeiro', 'cabana',
] as const

export const GENERATED_PASSWORD_WORD_COUNT = 3
export const GENERATED_PASSWORD_DIGITS = 6

/** Entropia teórica da senha automática, em bits. */
export function generatedPasswordEntropyBits(): number {
  return (
    GENERATED_PASSWORD_WORD_COUNT * Math.log2(PASSWORD_WORDS.length) +
    GENERATED_PASSWORD_DIGITS * Math.log2(10)
  )
}

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

/**
 * Senha permanente gerada de forma criptograficamente segura (nunca
 * Math.random) e sem qualquer relação com dados pessoais do cliente.
 *
 * Formato: Palavra-Palavra-Palavra-6 dígitos (ex.: Sol-Coral-Norte-482731),
 * com ~40,9 bits de entropia e seleção sem viés (amostragem por rejeição).
 */
export function generateSecurePassword(
  randomBytes: (size: number) => Uint8Array,
): string {
  let pool = randomBytes(32)
  let cursor = 0
  const nextByte = (): number => {
    if (cursor >= pool.length) {
      pool = randomBytes(32)
      cursor = 0
    }
    return pool[cursor++]
  }

  const total = PASSWORD_WORDS.length // 128 → 256 % 128 === 0, sem viés
  const words: string[] = []
  while (words.length < GENERATED_PASSWORD_WORD_COUNT) {
    const word = PASSWORD_WORDS[nextByte() % total]
    if (words.includes(word)) continue // sem repetição: mais legível
    words.push(word)
  }

  // Dígitos: amostragem por rejeição em 32 bits para não introduzir viés.
  const max = 10 ** GENERATED_PASSWORD_DIGITS
  const limit = Math.floor(4294967296 / max) * max
  let value = limit
  while (value >= limit) {
    value = ((nextByte() << 24) | (nextByte() << 16) | (nextByte() << 8) | nextByte()) >>> 0
  }
  const digits = String(value % max).padStart(GENERATED_PASSWORD_DIGITS, '0')

  return `${words.map(capitalize).join('-')}-${digits}`
}

// ─────────────────────────────────────────────────────────────
// Tentativas de login / bloqueio temporário
// ─────────────────────────────────────────────────────────────

/** Limites por conta (agência + e-mail). */
export const MAX_LOGIN_ATTEMPTS = 6
/** Limites por origem da tentativa (mitiga pulverização de senhas). */
export const MAX_ORIGIN_ATTEMPTS = 20
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
export const MAX_LOCK_MINUTES = 30

export interface AttemptRow {
  attempts: number
  first_attempt_at: string | null
  locked_until: string | null
}

export interface AttemptPolicy {
  maxAttempts: number
  windowMs: number
  maxLockMinutes: number
}

export const ACCOUNT_ATTEMPT_POLICY: AttemptPolicy = {
  maxAttempts: MAX_LOGIN_ATTEMPTS,
  windowMs: ATTEMPT_WINDOW_MS,
  maxLockMinutes: MAX_LOCK_MINUTES,
}

export const ORIGIN_ATTEMPT_POLICY: AttemptPolicy = {
  maxAttempts: MAX_ORIGIN_ATTEMPTS,
  windowMs: ATTEMPT_WINDOW_MS,
  maxLockMinutes: MAX_LOCK_MINUTES,
}

/** `true` quando o registro está em bloqueio temporário (liberação automática). */
export function isLockedOut(row: AttemptRow | null, now = Date.now()): boolean {
  if (!row?.locked_until) return false
  return new Date(row.locked_until).getTime() > now
}

/** Novo estado de tentativas após uma falha. */
export function nextAttemptState(
  row: AttemptRow | null,
  now = Date.now(),
  policy: AttemptPolicy = ACCOUNT_ATTEMPT_POLICY,
): { attempts: number; first_attempt_at: string; locked_until: string | null } {
  const firstAt = row?.first_attempt_at ? new Date(row.first_attempt_at).getTime() : 0
  const withinWindow = firstAt > 0 && now - firstAt <= policy.windowMs
  const attempts = (withinWindow ? row?.attempts ?? 0 : 0) + 1
  const lockMinutes = attempts >= policy.maxAttempts
    ? Math.min(5 * Math.floor(attempts / policy.maxAttempts), policy.maxLockMinutes)
    : 0
  return {
    attempts,
    first_attempt_at: new Date(withinWindow ? firstAt : now).toISOString(),
    locked_until: lockMinutes > 0 ? new Date(now + lockMinutes * 60 * 1000).toISOString() : null,
  }
}

/**
 * Entrada do hash de origem. O endereço nunca é guardado em texto aberto: o
 * pepper (segredo do servidor) impede reconstrução por quem lê o banco.
 */
export function originHashInput(pepper: string, agencyId: string, rawOrigin: string): string {
  return `${pepper}|${agencyId}|${String(rawOrigin ?? '').trim().toLowerCase()}`
}

// ─────────────────────────────────────────────────────────────
// Sessão do cliente
// ─────────────────────────────────────────────────────────────

/** Sessão persistente em dispositivo confiável: 30 dias de inatividade. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Prazo absoluto máximo, independentemente de atividade. */
export const SESSION_ABSOLUTE_MS = 180 * 24 * 60 * 60 * 1000
/** Rotação periódica do token opaco. */
export const SESSION_ROTATE_AFTER_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionRow {
  expires_at: string
  absolute_expires_at?: string | null
  revoked_at?: string | null
  rotated_at?: string | null
}

export function isSessionUsable(row: SessionRow | null, now = Date.now()): boolean {
  if (!row) return false
  if (row.revoked_at) return false
  if (new Date(row.expires_at).getTime() <= now) return false
  if (row.absolute_expires_at && new Date(row.absolute_expires_at).getTime() <= now) return false
  return true
}

/** `true` quando o token atual deve ser substituído por um novo. */
export function shouldRotateSession(row: SessionRow | null, now = Date.now()): boolean {
  if (!row) return false
  const rotatedAt = row.rotated_at ? new Date(row.rotated_at).getTime() : 0
  if (!rotatedAt) return true
  return now - rotatedAt >= SESSION_ROTATE_AFTER_MS
}

/** Nova validade deslizante, sempre respeitando o prazo absoluto. */
export function slidingExpiry(row: SessionRow | null, now = Date.now()): string {
  const sliding = now + SESSION_TTL_MS
  const absolute = row?.absolute_expires_at
    ? new Date(row.absolute_expires_at).getTime()
    : now + SESSION_ABSOLUTE_MS
  return new Date(Math.min(sliding, absolute)).toISOString()
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
  'logout', 'recovery_requested', 'origin_throttled', 'session_rotated',
] as const

const FORBIDDEN_AUDIT_KEYS = [
  'password', 'senha', 'password_hash', 'hash', 'token', 'token_hash', 'link',
  'message', 'mensagem', 'secret', 'initial_password', 'senha_inicial',
  'ip', 'origin', 'origem', 'user_agent',
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
