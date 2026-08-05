import { describe, it, expect } from 'vitest'
import { canAccessRoute, permissionsForRoute, isPublicRoute } from '../routePermissions'

const allow = (...keys: string[]) => (k: string) => keys.includes(k)

describe('routePermissions', () => {
  it('libera rotas públicas sem permissão', () => {
    expect(isPublicRoute('/orcamento/abc')).toBe(true)
    expect(canAccessRoute('/orcamento/abc', () => false)).toBe(true)
  })

  it('bloqueia o financeiro sem financial.access', () => {
    expect(canAccessRoute('/financeiro', () => false)).toBe(false)
    expect(canAccessRoute('/financeiro', allow('financial.access'))).toBe(true)
  })

  it('usa o prefixo mais específico', () => {
    expect(permissionsForRoute('/gestao-clientes/funil')).toEqual(['opportunities.view'])
    expect(canAccessRoute('/gestao-clientes/funil', allow('clients.view'))).toBe(false)
    expect(canAccessRoute('/gestao-clientes/clientes', allow('clients.view'))).toBe(true)
  })

  it('cobre rotas filhas por prefixo', () => {
    expect(canAccessRoute('/ferramentas-ia/trip-wallet/123', allow('wallet.view'))).toBe(true)
    expect(canAccessRoute('/ferramentas-ia/trip-wallet/123', allow('quotes.view'))).toBe(false)
  })

  it('rota não mapeada permanece liberada para autenticados', () => {
    expect(canAccessRoute('/rota-inexistente', () => false)).toBe(true)
  })
})
