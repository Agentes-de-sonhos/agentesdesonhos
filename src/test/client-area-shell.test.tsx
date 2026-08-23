/**
 * Etapa 2 — estrutura visual da Área do Cliente: login moderno, navegação
 * autenticada, página inicial verdadeira e seções estruturais sem consulta de
 * dados. A fundação de autenticação da Etapa 1.1 é apenas reutilizada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AgencyDomainInfo } from '@/lib/agencyDomains'
import { CLIENT_AREA_NAV, viewFromSearch, firstName } from '@/lib/clientAreaNav'

const invoke = vi.fn()
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import AgencyClientArea from '@/pages/whitelabel/AgencyClientArea'

const baseInfo = {
  user_id: '11111111-1111-4111-8111-111111111111',
  agency_slug: 'agencia-teste',
  hostname: 'localhost',
  is_primary: true,
  agency_name: 'Agência Exemplo',
  owner_name: null,
  logo_url: null,
  cover_image_url: null,
  primary_color: '#0F766E',
  phone: '11988887777',
  city: null,
  state: null,
  bio: null,
  public_slug: null,
  cnpj: null,
} as AgencyDomainInfo

const renderPage = (info: AgencyDomainInfo = baseInfo) =>
  render(
    <MemoryRouter>
      <AgencyClientArea info={info} />
    </MemoryRouter>,
  )

const SESSION = { client: { id: 'c1', name: 'Passageiro Teste', email: 'p@exemplo.com' } }

const loggedIn = async (info: AgencyDomainInfo = baseInfo) => {
  window.localStorage.setItem('ads_client_area_session:localhost', 'a'.repeat(64))
  invoke.mockResolvedValue({ data: SESSION })
  const view = renderPage(info)
  await waitFor(() => expect(screen.getByRole('heading', { name: /Olá, Passageiro/i })).toBeTruthy())
  return view
}

beforeEach(() => {
  invoke.mockReset()
  window.localStorage.clear()
  window.history.replaceState(null, '', '/area-do-cliente')
})

describe('navegação declarativa', () => {
  it('define as seções da etapa e o que já é funcional', () => {
    expect(CLIENT_AREA_NAV.map((i) => i.view)).toEqual([
      'inicio', 'viagens', 'documentos', 'perfil', 'atendimento',
    ])
    const ready = CLIENT_AREA_NAV.filter((i) => i.ready).map((i) => i.view)
    expect(ready).toEqual(['inicio', 'perfil', 'atendimento'])
    expect(CLIENT_AREA_NAV.filter((i) => i.mobileBar)).toHaveLength(4)
  })

  it('lê a seção da query string com fallback seguro', () => {
    expect(viewFromSearch('?area=perfil')).toBe('perfil')
    expect(viewFromSearch('?area=hackeado')).toBe('inicio')
    expect(viewFromSearch('')).toBe('inicio')
  })

  it('extrai o primeiro nome sem inventar saudação', () => {
    expect(firstName('Maria Silva Souza')).toBe('Maria')
    expect(firstName(null)).toBe('')
  })
})

describe('tela de login', () => {
  it('herda a identidade da agência e usa os textos aprovados', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    expect(screen.getByRole('heading', { level: 1, name: 'Área do Cliente' })).toBeTruthy()
    expect(screen.getByText(/Acompanhe suas viagens e acesse as informações/i)).toBeTruthy()
    expect(screen.getAllByText(/Agência Exemplo/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Esqueci minha senha/i })).toBeTruthy()
  })

  it('mostra o logotipo da agência quando existe', async () => {
    renderPage({ ...baseInfo, agency_name: 'Outra Agência', logo_url: 'https://cdn.exemplo/logo.png' })
    const logo = await screen.findByAltText('Logotipo da Outra Agência')
    expect(logo.getAttribute('src')).toBe('https://cdn.exemplo/logo.png')
  })

  it('mantém o acesso por código como opção secundária recolhida', async () => {
    renderPage()
    const toggle = await screen.findByRole('button', { name: /Recebeu um link com código/i })
    expect(screen.queryByLabelText('Código de acesso')).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByLabelText('Código de acesso')).toBeTruthy()
    expect(screen.getByText(/somente para acessar um conteúdo específico/i)).toBeTruthy()
  })

  it('associa o erro de login aos campos, sem chamar o servidor', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }))
    const error = await screen.findByRole('alert')
    expect(error.textContent).toMatch(/Informe seu e-mail e sua senha/i)
    expect(screen.getByLabelText('E-mail').getAttribute('aria-describedby')).toBe('ca-login-error')
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('estados da sessão', () => {
  it('não apaga o token em erro temporário de rede', async () => {
    window.localStorage.setItem('ads_client_area_session:localhost', 'a'.repeat(64))
    invoke.mockResolvedValue({ data: null, error: new Error('network') })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    expect(window.localStorage.getItem('ads_client_area_session:localhost')).toBe('a'.repeat(64))
    expect(screen.getByRole('alert').textContent).toMatch(/Tente novamente em instantes/i)
  })

  it('apaga o token quando o servidor recusa a sessão', async () => {
    window.localStorage.setItem('ads_client_area_session:localhost', 'a'.repeat(64))
    invoke.mockResolvedValue({ data: { error: 'Acesso bloqueado.' } })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    expect(window.localStorage.getItem('ads_client_area_session:localhost')).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(/Acesso bloqueado/i)
  })

  it('encerra a sessão e volta ao login ao sair', async () => {
    await loggedIn()
    invoke.mockResolvedValue({ data: { ok: true } })
    fireEvent.click(screen.getAllByRole('button', { name: /Sair/i })[0])
    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    expect(window.localStorage.getItem('ads_client_area_session:localhost')).toBeNull()
  })
})

describe('área autenticada', () => {
  it('exibe saudação, agência e conteúdo verdadeiro sobre viagens', async () => {
    await loggedIn()
    expect(screen.getByText(/Bem-vindo à sua área exclusiva/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Suas viagens em um só lugar' })).toBeTruthy()
    expect(screen.getByText(/Em breve, você poderá acompanhar aqui suas viagens/i)).toBeTruthy()
    expect(screen.queryByText(/você não possui viagens/i)).toBeNull()
    expect(screen.queryByText(/pontos|saldo|fidelidade/i)).toBeNull()
  })

  it('navega entre as seções sem consultar dados de viagens ou documentos', async () => {
    await loggedIn()
    const callsAfterSession = invoke.mock.calls.length

    fireEvent.click(screen.getAllByRole('button', { name: 'Minhas viagens' })[0])
    expect(await screen.findByText(/Suas viagens aparecerão aqui assim que esta área/i)).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Meus documentos' })[0])
    expect(await screen.findByText(/Seus contratos e documentos de viagem serão organizados aqui/i)).toBeTruthy()

    expect(invoke.mock.calls.length).toBe(callsAfterSession)
  })

  it('mostra somente dados básicos no perfil', async () => {
    await loggedIn()
    fireEvent.click(screen.getAllByRole('button', { name: 'Meu perfil' })[0])
    expect((await screen.findAllByText('Passageiro Teste')).length).toBeGreaterThan(0)
    expect(screen.getByText('p@exemplo.com')).toBeTruthy()
    expect(screen.queryByText(/CPF|Passaporte|Nascimento|Endereço/i)).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: /Alterar senha/i })[0])
    expect(screen.getByLabelText('Nova senha')).toBeTruthy()
  })

  it('valida a nova senha no cliente antes de chamar o servidor', async () => {
    await loggedIn()
    fireEvent.click(screen.getAllByRole('button', { name: 'Meu perfil' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /Alterar senha/i })[0])
    const before = invoke.mock.calls.length
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar nova senha/i }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/no mínimo 8 caracteres/i)
    expect(invoke.mock.calls.length).toBe(before)
  })

  it('usa o WhatsApp real da agência com mensagem pronta', async () => {
    await loggedIn()
    fireEvent.click(screen.getAllByRole('button', { name: 'Falar com a agência' })[0])
    const link = await screen.findByRole('link', { name: /Falar com a agência/i })
    expect(link.getAttribute('href')).toContain('https://wa.me/5511988887777')
    expect(decodeURIComponent(link.getAttribute('href') || '')).toContain(
      'Olá! Estou acessando minha Área do Cliente e preciso de ajuda.',
    )
  })

  it('não renderiza botão de atendimento quebrado sem contato configurado', async () => {
    await loggedIn({ ...baseInfo, phone: null })
    fireEvent.click(screen.getAllByRole('button', { name: 'Meu perfil' })[0])
    expect(screen.queryByRole('link', { name: /Falar com a agência/i })).toBeNull()
  })
})

describe('proteção da rota autenticada', () => {
  const files = [
    'src/pages/whitelabel/AgencyClientArea.tsx',
    'src/components/whitelabel/clientarea/ClientAreaShell.tsx',
    'src/components/whitelabel/clientarea/ClientAreaLogin.tsx',
    'src/components/whitelabel/clientarea/ClientAreaSections.tsx',
    'src/components/whitelabel/clientarea/ClientAreaSupportCard.tsx',
    'src/components/whitelabel/clientarea/ClientAreaCodeAccess.tsx',
  ].map((f) => [f, readFileSync(f, 'utf8')] as const)

  it('não usa HTML inseguro nem scripts externos', () => {
    for (const [name, src] of files) {
      expect(src, name).not.toContain('dangerouslySetInnerHTML')
      expect(src, name).not.toMatch(/<script/i)
      expect(src, name).not.toMatch(/gtag|fbq|googletagmanager|analytics/i)
    }
  })

  it('nunca coloca token na URL nem em log', () => {
    for (const [name, src] of files) {
      expect(src, name).not.toMatch(/searchParams\.set\(\s*['"]token/)
      const logs = src.match(/console\.(log|error|warn)\([^)]*\)/g) ?? []
      for (const line of logs) expect(line).not.toMatch(/token|password|senha/i)
    }
  })

  it('não fixa cores das referências (Booking/Decolar/CVC)', () => {
    for (const [name, src] of files) {
      expect(src, name).not.toMatch(/#003580|#febb02|#5c2d91|bg-\[#/i)
      expect(src, name).not.toMatch(/\b(bg|text)-(blue|purple|yellow|indigo)-\d{2,3}\b/)
    }
  })
})
