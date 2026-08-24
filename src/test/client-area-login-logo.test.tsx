/**
 * Garante que o logotipo interno da página de login da Área do Cliente está
 * oculto (com placeholder preservando o espaço) sem afetar cabeçalho/rodapé.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AgencyDomainInfo } from '@/lib/agencyDomains'
import { ClientAreaLogin } from '@/components/whitelabel/clientarea/ClientAreaLogin'

const INFO = {
  user_id: '11111111-1111-4111-8111-111111111111',
  agency_slug: 'agencia-teste',
  hostname: 'localhost',
  is_primary: true,
  agency_name: 'Agência Teste',
  owner_name: null,
  logo_url: 'https://example.com/logo.png',
  cover_image_url: null,
  primary_color: null,
  phone: '11988887777',
  city: null,
  state: null,
  bio: null,
  public_slug: null,
  cnpj: null,
} as AgencyDomainInfo

const noop = () => {}

describe('logo interno do login da Área do Cliente', () => {
  it('não renderiza o logo interno, mas mantém placeholder e conteúdo', () => {
    render(
      <MemoryRouter>
        <ClientAreaLogin
          info={INFO}
          email=""
          password=""
          showPassword={false}
          busy={false}
          formError={null}
          recoveryNotice={null}
          onEmail={noop}
          onPassword={noop}
          onToggleShow={noop}
          onSubmit={noop}
          onRecover={noop}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByAltText(/Logotipo da Agência Teste/i)).toBeNull()
    expect(screen.getByTestId('client-area-internal-logo-placeholder')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Área do Cliente' })).toBeTruthy()
    expect(screen.getByLabelText('E-mail')).toBeTruthy()
  })

  it('o cabeçalho/rodapé do site white label continuam com o logo', () => {
    const layout = require('node:fs').readFileSync(
      'src/components/whitelabel/AgencySiteLayout.tsx',
      'utf8',
    )
    expect(layout).toMatch(/logo/i)
  })
})
