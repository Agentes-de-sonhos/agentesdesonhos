/**
 * Etapa 1.1 — testes reais das guardas da Área do Cliente White Label.
 * Nenhum dado real de cliente é utilizado e nada é gravado em produção.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ACCOUNT_ATTEMPT_POLICY, ORIGIN_ATTEMPT_POLICY, GENERIC_LOGIN_ERROR,
  GENERIC_RECOVERY_MESSAGE, MAX_LOGIN_ATTEMPTS, MAX_ORIGIN_ATTEMPTS,
  PASSWORD_WORDS, SESSION_ABSOLUTE_MS, SESSION_ROTATE_AFTER_MS, SESSION_TTL_MS,
  assertCanManageAccess, assertClientCanHaveAccess, assertDomainContext,
  assertHostnamePresent, assertOriginMatchesHost, assertSameAgency,
  generateSecurePassword, generatedPasswordEntropyBits, hostFromOrigin, isLockedOut,
  isObviousPassword, isPlatformOriginHost, isSessionUsable, isValidEmail, nextAttemptState,
  normalizeEmail, normalizeHost, originHashInput, publicAccountView, resolveAllowedOrigin,
  sanitizeAuditDetails, shouldRotateSession, slidingExpiry, validatePassword,
} from '../../supabase/functions/_shared/clientAreaGuards'

const AGENCY_A = '11111111-1111-4111-8111-111111111111'
const AGENCY_B = '22222222-2222-4222-8222-222222222222'

/** Fonte de bytes criptográfica real (Node/jsdom expõem webcrypto). */
const randomBytes = (size: number) => crypto.getRandomValues(new Uint8Array(size))

// ─────────────────────────────────────────────────────────────
describe('senhas', () => {
  it('gera senha com entropia mínima de 40 bits', () => {
    expect(PASSWORD_WORDS.length).toBe(128)
    expect(new Set(PASSWORD_WORDS).size).toBe(PASSWORD_WORDS.length)
    expect(generatedPasswordEntropyBits()).toBeGreaterThanOrEqual(40)
  })

  it('gera senha no formato Palavra-Palavra-Palavra-6 dígitos', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateSecurePassword(randomBytes)
      expect(pwd).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+-\d{6}$/)
      expect(pwd.length).toBeLessThanOrEqual(72)
      expect(validatePassword(pwd)).toBeNull()
    }
  })

  it('não repete palavras e varia entre chamadas (sem Math.random)', () => {
    const generated = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const pwd = generateSecurePassword(randomBytes)
      const words = pwd.split('-').slice(0, 3)
      expect(new Set(words).size).toBe(3)
      generated.add(pwd)
    }
    expect(generated.size).toBeGreaterThan(190)
  })

  it('não usa Math.random em nenhum ponto do módulo', () => {
    const src = readFileSync('supabase/functions/_shared/clientAreaGuards.ts', 'utf8')
    expect(src).not.toContain('Math.random(')
  })


  it('não utiliza dados pessoais nas palavras da senha automática', () => {
    const personal = ['nome', 'email', 'cpf', 'telefone', 'cliente', 'agencia', 'senha']
    for (const word of PASSWORD_WORDS) {
      expect(personal).not.toContain(word)
    }
  })

  it('recusa senhas óbvias mesmo definidas pela agência', () => {
    for (const bad of ['12345678', 'password', 'senha123', 'aaaaaaaa', '00000000']) {
      expect(isObviousPassword(bad)).toBe(true)
      expect(validatePassword(bad)?.status).toBe(400)
    }
    expect(validatePassword('Sol-Coral-Norte-482731')).toBeNull()
  })

  it('respeita limites de tamanho do bcrypt e espaços nas pontas', () => {
    expect(validatePassword('curta1')?.status).toBe(400)
    expect(validatePassword('x'.repeat(73))?.status).toBe(400)
    expect(validatePassword(' EspacoNaPonta1 ')?.status).toBe(400)
  })

  it('nunca devolve hash ou senha em consultas posteriores', () => {
    const row = {
      id: 'abc', status: 'active', email_normalized: 'a@b.com',
      password_hash: '$2a$10$hash', must_change_password: false, created_at: 'x',
    }
    const view = publicAccountView(row)
    expect(view).not.toHaveProperty('password_hash')
    expect(Object.values(view!)).not.toContain('$2a$10$hash')
  })
})

// ─────────────────────────────────────────────────────────────
describe('hostname, origem e CORS', () => {
  it('exige hostname em toda ação pública', () => {
    expect(assertHostnamePresent(undefined)?.status).toBe(400)
    expect(assertHostnamePresent('')?.status).toBe(400)
    expect(assertHostnamePresent('   ')?.status).toBe(400)
    expect(assertHostnamePresent('100limites.tur.br')).toBeNull()
  })

  it('normaliza hostname com protocolo, porta e caminho', () => {
    expect(normalizeHost('HTTPS://100Limites.tur.br:443/area')).toBe('100limites.tur.br')
    expect(hostFromOrigin('https://100limites.tur.br')).toBe('100limites.tur.br')
    expect(hostFromOrigin('null')).toBe('')
  })

  it('aceita apenas o próprio domínio ou ambientes da plataforma', () => {
    expect(resolveAllowedOrigin('https://100limites.tur.br', '100limites.tur.br'))
      .toBe('https://100limites.tur.br')
    expect(resolveAllowedOrigin('https://app.agentesdesonhos.com.br', '100limites.tur.br'))
      .toBe('https://app.agentesdesonhos.com.br')
    expect(resolveAllowedOrigin('https://atacante.com', '100limites.tur.br')).toBeNull()
    // Sem Origin (não-navegador): sem eco de origem específica
    expect(resolveAllowedOrigin(null, '100limites.tur.br')).toBe('*')
  })

  it('recusa origem que não corresponde ao domínio informado', () => {
    expect(assertOriginMatchesHost('https://outra-agencia.tur.br', '100limites.tur.br')?.status).toBe(403)
    expect(assertOriginMatchesHost('https://100limites.tur.br', '100limites.tur.br')).toBeNull()
    expect(assertOriginMatchesHost(null, '100limites.tur.br')).toBeNull()
  })

  it('reconhece somente hosts oficiais como plataforma', () => {
    expect(isPlatformOriginHost('app.agentesdesonhos.com.br')).toBe(true)
    expect(isPlatformOriginHost('id-preview--x.lovable.app')).toBe(true)
    expect(isPlatformOriginHost('localhost')).toBe(true)
    expect(isPlatformOriginHost('agentesdesonhos.com.br.atacante.com')).toBe(false)
  })

  it('recusa domínio sem Área do Cliente elegível', () => {
    expect(assertDomainContext(null)?.status).toBe(403)
    expect(assertDomainContext({ ok: false, reason: 'inactive_domain' })?.status).toBe(403)
    expect(assertDomainContext({ ok: false, reason: 'not_eligible' })?.status).toBe(403)
    expect(assertDomainContext({ ok: true, agency_id: AGENCY_A })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
describe('isolamento multiagência', () => {
  it('impede administração cruzada entre agências', () => {
    expect(assertSameAgency(AGENCY_B, AGENCY_A)?.status).toBe(403)
    expect(assertSameAgency(AGENCY_A, AGENCY_A)).toBeNull()
    expect(assertSameAgency(null, AGENCY_A)?.status).toBe(404)
    expect(assertSameAgency(AGENCY_A, undefined)?.status).toBe(403)
  })

  it('o mesmo e-mail em agências diferentes gera identidades independentes', () => {
    const email = 'passageiro@exemplo.com'
    const keyA = `${AGENCY_A}|${normalizeEmail(email)}`
    const keyB = `${AGENCY_B}|${normalizeEmail(email.toUpperCase())}`
    expect(normalizeEmail(email)).toBe(normalizeEmail(email.toUpperCase()))
    expect(keyA).not.toBe(keyB)
  })

  it('a origem é hasheada por agência (nunca em texto aberto)', () => {
    const a = originHashInput('pepper', AGENCY_A, '203.0.113.9')
    const b = originHashInput('pepper', AGENCY_B, '203.0.113.9')
    expect(a).not.toBe(b)
    expect(a).toContain('pepper')
  })

  it('valida e-mail do cliente antes de criar acesso', () => {
    expect(assertClientCanHaveAccess(null)?.status).toBe(404)
    expect(assertClientCanHaveAccess({ email: '' })?.status).toBe(400)
    expect(assertClientCanHaveAccess({ email: 'nao-email' })?.status).toBe(400)
    expect(assertClientCanHaveAccess({ email: 'ok@exemplo.com' })).toBeNull()
    expect(isValidEmail('x'.repeat(250) + '@a.com')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
describe('permissões administrativas', () => {
  it('somente proprietário/colaborador autorizado gerencia acesso', () => {
    expect(assertCanManageAccess(null)?.status).toBe(401)
    expect(assertCanManageAccess({ authenticated: true, white_label_active: false, can_manage: true })?.status).toBe(403)
    expect(assertCanManageAccess({ authenticated: true, white_label_active: true, can_manage: false })?.status).toBe(403)
    expect(assertCanManageAccess({ authenticated: true, white_label_active: true, can_manage: true })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
describe('tentativas de login', () => {
  const now = Date.parse('2026-01-10T12:00:00.000Z')

  it('bloqueia a conta após o limite e libera automaticamente', () => {
    let row: any = null
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      row = nextAttemptState(row, now, ACCOUNT_ATTEMPT_POLICY)
    }
    expect(row.attempts).toBe(MAX_LOGIN_ATTEMPTS)
    expect(row.locked_until).not.toBeNull()
    expect(isLockedOut(row, now)).toBe(true)
    // Liberação automática depois do prazo
    expect(isLockedOut(row, now + 31 * 60 * 1000)).toBe(false)
  })

  it('tolera muito mais tentativas por origem do que por conta', () => {
    expect(MAX_ORIGIN_ATTEMPTS).toBeGreaterThan(MAX_LOGIN_ATTEMPTS)
    let row: any = null
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      row = nextAttemptState(row, now, ORIGIN_ATTEMPT_POLICY)
    }
    expect(row.locked_until).toBeNull()
    for (let i = MAX_LOGIN_ATTEMPTS; i < MAX_ORIGIN_ATTEMPTS; i++) {
      row = nextAttemptState(row, now, ORIGIN_ATTEMPT_POLICY)
    }
    expect(isLockedOut(row, now)).toBe(true)
  })

  it('reinicia a contagem quando a janela expira', () => {
    const first = nextAttemptState(null, now)
    const later = nextAttemptState(first, now + 20 * 60 * 1000)
    expect(later.attempts).toBe(1)
  })

  it('o tempo de espera cresce progressivamente e tem teto', () => {
    let row: any = null
    for (let i = 0; i < 60; i++) row = nextAttemptState(row, now, ACCOUNT_ATTEMPT_POLICY)
    const waitMinutes = (Date.parse(row.locked_until) - now) / 60000
    expect(waitMinutes).toBeLessThanOrEqual(30)
    expect(waitMinutes).toBeGreaterThanOrEqual(5)
  })

  it('mensagem pública é sempre genérica', () => {
    expect(GENERIC_LOGIN_ERROR).not.toMatch(/não cadastrad|inexistente|não existe/i)
    expect(GENERIC_RECOVERY_MESSAGE).not.toMatch(/enviamos|e-mail foi enviado|enviado para/i)
  })
})

// ─────────────────────────────────────────────────────────────
describe('sessões', () => {
  const now = Date.parse('2026-02-01T10:00:00.000Z')
  const base = {
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
    absolute_expires_at: new Date(now + SESSION_ABSOLUTE_MS).toISOString(),
    rotated_at: new Date(now).toISOString(),
    revoked_at: null,
  }

  it('sessão persistente de 30 dias com prazo absoluto de 180 dias', () => {
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
    expect(SESSION_ABSOLUTE_MS).toBe(180 * 24 * 60 * 60 * 1000)
    expect(isSessionUsable(base, now)).toBe(true)
  })

  it('recusa sessão expirada, revogada ou fora do prazo absoluto', () => {
    expect(isSessionUsable(null, now)).toBe(false)
    expect(isSessionUsable({ ...base, revoked_at: new Date(now).toISOString() }, now)).toBe(false)
    expect(isSessionUsable({ ...base, expires_at: new Date(now - 1).toISOString() }, now)).toBe(false)
    expect(isSessionUsable({ ...base, absolute_expires_at: new Date(now - 1).toISOString() }, now)).toBe(false)
  })

  it('rotaciona o token periodicamente', () => {
    expect(shouldRotateSession(base, now)).toBe(false)
    expect(shouldRotateSession(base, now + SESSION_ROTATE_AFTER_MS)).toBe(true)
    expect(shouldRotateSession({ ...base, rotated_at: null }, now)).toBe(true)
  })

  it('a validade deslizante nunca ultrapassa o prazo absoluto', () => {
    const nearAbsolute = { ...base, absolute_expires_at: new Date(now + 60_000).toISOString() }
    expect(Date.parse(slidingExpiry(nearAbsolute, now))).toBe(now + 60_000)
    expect(Date.parse(slidingExpiry(base, now))).toBe(now + SESSION_TTL_MS)
  })
})

// ─────────────────────────────────────────────────────────────
describe('auditoria', () => {
  it('remove senha, hash, token, origem e user agent', () => {
    const clean = sanitizeAuditDetails({
      mode: 'auto', attempts: 3, password: 'x', senha_inicial: 'y', token_hash: 'z',
      ip: '203.0.113.9', origin: 'https://a.com', user_agent: 'Mozilla', link: 'http://x',
    })
    expect(clean).toEqual({ mode: 'auto', attempts: 3 })
  })

  it('descarta textos longos que possam vazar conteúdo', () => {
    const clean = sanitizeAuditDetails({ nota: 'x'.repeat(300) })
    expect(clean).toEqual({})
  })
})
