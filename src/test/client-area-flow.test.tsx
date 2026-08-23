/**
 * Etapa 1.1 — comportamento da Área do Cliente pública (login, recuperação,
 * hostname obrigatório) e conferência estática das Edge Functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AgencyDomainInfo } from '@/lib/agencyDomains'
import { clientAreaAuthBody, agencyWhatsappLink, RECOVERY_GUIDANCE } from '@/lib/clientAreaAccess'

const invoke = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import AgencyClientArea from '@/pages/whitelabel/AgencyClientArea'

const INFO = {
  user_id: '11111111-1111-4111-8111-111111111111',
  agency_slug: 'agencia-teste',
  hostname: 'localhost',
  is_primary: true,
  agency_name: 'Agência Teste',
  owner_name: null,
  logo_url: null,
  cover_image_url: null,
  primary_color: null,
  phone: '11988887777',
  city: null,
  state: null,
  bio: null,
  public_slug: null,
  cnpj: null,
} as AgencyDomainInfo

const renderPage = () =>
  render(
    <MemoryRouter>
      <AgencyClientArea info={INFO} />
    </MemoryRouter>,
  )

beforeEach(() => {
  invoke.mockReset()
  window.localStorage.clear()
})

describe('corpo das chamadas', () => {
  it('inclui sempre o hostname normalizado', () => {
    expect(clientAreaAuthBody('login', ' 100Limites.TUR.BR ', { email: 'a@b.com' })).toEqual({
      action: 'login', hostname: '100limites.tur.br', email: 'a@b.com',
    })
    expect(clientAreaAuthBody('session', 'x.tur.br', { token: 't' })).toHaveProperty('hostname', 'x.tur.br')
  })

  it('monta o link de WhatsApp da agência', () => {
    expect(agencyWhatsappLink('11988887777')).toBe('https://wa.me/5511988887777')
    expect(agencyWhatsappLink('123')).toBeNull()
  })
})

describe('login público', () => {
  it('envia hostname, ação e credenciais e guarda o token opaco', async () => {
    invoke.mockResolvedValue({
      data: { token: 'a'.repeat(64), client: { id: 'c1', name: 'Passageiro', email: 'p@ex.com' } },
    })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'p@ex.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Sol-Coral-Norte-482731' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    const body = invoke.mock.calls[0][1].body
    expect(invoke.mock.calls[0][0]).toBe('client-area-auth')
    expect(body.action).toBe('login')
    expect(body.hostname).toBe('localhost')
    expect(body.email).toBe('p@ex.com')

    await waitFor(() =>
      expect(window.localStorage.getItem('ads_client_area_session:localhost')).toBe('a'.repeat(64)))
  })

  it('não revalida sessão quando não há token guardado', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    expect(invoke).not.toHaveBeenCalled()
  })

  it('revalida a sessão guardada enviando o hostname e aceita rotação de token', async () => {
    window.localStorage.setItem('ads_client_area_session:localhost', 'b'.repeat(64))
    invoke.mockResolvedValue({
      data: { client: { id: 'c1', name: 'Passageiro', email: 'p@ex.com' }, token: 'c'.repeat(64) },
    })
    renderPage()
    await waitFor(() => expect(invoke).toHaveBeenCalled())
    const body = invoke.mock.calls[0][1].body
    expect(body.action).toBe('session')
    expect(body.hostname).toBe('localhost')
    await waitFor(() =>
      expect(window.localStorage.getItem('ads_client_area_session:localhost')).toBe('c'.repeat(64)))
  })
})

describe('esqueci minha senha', () => {
  it('envia hostname e mostra orientação real, sem prometer e-mail', async () => {
    invoke.mockResolvedValue({ data: { ok: true, message: RECOVERY_GUIDANCE } })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'p@ex.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Esqueci minha senha/i }))

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    const body = invoke.mock.calls[0][1].body
    expect(body.action).toBe('recovery')
    expect(body.hostname).toBe('localhost')

    const notice = await screen.findByText(RECOVERY_GUIDANCE)
    expect(notice).toBeTruthy()
    expect(RECOVERY_GUIDANCE).not.toMatch(/enviamos|você receberá|verifique (sua|seu) (caixa|e-mail)/i)
    expect(screen.getAllByRole('link', { name: /Falar com a agência/i }).length).toBeGreaterThan(0)
  })
})

describe('separação entre login e código de link', () => {
  it('o bloco de código não sugere que o login exige um código', async () => {
    renderPage()
    const toggle = await screen.findByRole('button', { name: /Recebeu um link com código/i })
    fireEvent.click(toggle)
    expect(screen.getByLabelText('Código de acesso')).toBeTruthy()
    expect(screen.queryByText(/use o código do link recebido logo abaixo/i)).toBeNull()
  })
})

describe('conferência estática das Edge Functions', () => {
  const auth = readFileSync('supabase/functions/client-area-auth/index.ts', 'utf8')
  const adminFn = readFileSync('supabase/functions/client-area-admin/index.ts', 'utf8')

  it('a função pública não usa CORS aberto de forma fixa', () => {
    expect(auth).not.toContain("'Access-Control-Allow-Origin': '*'")
    expect(adminFn).not.toContain("'Access-Control-Allow-Origin': '*'")
  })

  it('a função pública exige hostname e resolve a agência pelo domínio', () => {
    expect(auth).toContain('assertHostnamePresent')
    expect(auth).toContain('client_area_domain_context')
    expect(auth).toContain('assertOriginMatchesHost')
  })

  it('nunca aceita agency_id vindo do navegador', () => {
    expect(auth).not.toMatch(/body\.agency_id/)
    expect(adminFn).not.toMatch(/body\.agency_id/)
  })

  it('aplica limitação por conta e por origem', () => {
    expect(auth).toContain('client_area_origin_attempts')
    expect(auth).toContain('ORIGIN_ATTEMPT_POLICY')
    expect(auth).toContain('checkRateLimit')
  })

  it('não registra senha, hash ou token em log', () => {
    for (const src of [auth, adminFn]) {
      const logs = src.match(/console\.(log|error|warn)\([^)]*\)/g) ?? []
      for (const line of logs) {
        expect(line).not.toMatch(/password|senha|token|hash/i)
      }
    }
  })
})
