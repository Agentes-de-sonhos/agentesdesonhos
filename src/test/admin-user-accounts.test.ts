import { describe, it, expect } from 'vitest'
import {
  buildAdminAccountRows, allowedActions, isSyntheticTeamEmail, isOrphanMember,
  type TeamOverview, type BaseAccountRow,
} from '@/lib/adminUserAccounts'

const profile = (over: Partial<BaseAccountRow> = {}): BaseAccountRow => ({
  id: 'p1', user_id: 'u1', name: 'Nome', email: 'real@x.com', plan: 'start', is_active: true, ...over,
})

const overview = (over: Partial<TeamOverview> = {}): TeamOverview => ({ members: [], invites: [], ...over })

describe('painel administrativo — contas de equipe', () => {
  it('substitui o e-mail sintético pelo e-mail real do colaborador', () => {
    const rows = buildAdminAccountRows(
      [profile({ user_id: 'auth-1', email: 'henrique.d14b95d2@team.agentesdesonhos.local' })],
      overview({ members: [{ member_id: 'm1', auth_user_id: 'auth-1', auth_exists: true, agency_id: 'ag', full_name: 'Henrique Lima', real_email: 'paraiso05@paraisoviagens.com', status: 'active', effective_plan: 'premium', access_profile_name: 'Consultor de Viagens — sem Financeiro', master_name: 'Daniela' }] }),
    )
    expect(rows[0].email).toBe('paraiso05@paraisoviagens.com')
    expect(isSyntheticTeamEmail(rows[0].email)).toBe(false)
    expect(rows[0].kind).toBe('member')
  })

  it('exibe o plano efetivo herdado da master sem alterar a assinatura individual', () => {
    const rows = buildAdminAccountRows(
      [profile({ user_id: 'auth-1', plan: 'start' })],
      overview({ members: [{ member_id: 'm1', auth_user_id: 'auth-1', auth_exists: true, agency_id: 'ag', full_name: 'Nathaly Cruz', real_email: 'atendimento@paraisoviagens.com', status: 'active', effective_plan: 'premium' }] }),
    )
    expect(rows[0].plan).toBe('premium')
    expect(rows[0].plan_inherited).toBe(true)
  })

  it('mantém o perfil de acesso separado do plano', () => {
    const rows = buildAdminAccountRows(
      [profile({ user_id: 'auth-1' })],
      overview({ members: [{ member_id: 'm1', auth_user_id: 'auth-1', auth_exists: true, agency_id: 'ag', full_name: 'N', real_email: 'n@x.com', status: 'active', effective_plan: 'premium', access_profile_name: 'Financeiro + Visão Comercial' }] }),
    )
    expect(rows[0].access_profile_name).toBe('Financeiro + Visão Comercial')
  })

  it('lista convites pendentes como linhas próprias, sem duplicidade', () => {
    const rows = buildAdminAccountRows([profile({ user_id: 'master' })], overview({
      invites: [
        { invite_id: 'i1', agency_id: 'ag', email: 'comercial@paraisoviagens.com', full_name: 'Luana Barbosa', effective_plan: 'premium', access_profile_name: 'Consultor de Viagens — sem Financeiro' },
        { invite_id: 'i2', agency_id: 'ag', email: 'vendas@paraisoviagens.com', full_name: 'Eduardo Martins', effective_plan: 'premium' },
      ],
    }))
    expect(rows).toHaveLength(3)
    const invites = rows.filter(r => r.kind === 'invite')
    expect(invites.map(r => r.email)).toEqual(['comercial@paraisoviagens.com', 'vendas@paraisoviagens.com'])
    expect(invites.every(r => r.is_active === false)).toBe(true)
    expect(new Set(rows.map(r => r.id)).size).toBe(3)
  })

  it('marca colaborador ativo sem auth user como órfão e não como ativo', () => {
    const member = { member_id: 'm1', auth_user_id: 'ghost', auth_exists: false, agency_id: 'ag', full_name: 'Eduardo Martins', real_email: 'vendas@paraisoviagens.com', status: 'active' }
    expect(isOrphanMember(member)).toBe(true)
    const rows = buildAdminAccountRows([], overview({ members: [member] }))
    expect(rows[0].is_orphan).toBe(true)
    expect(rows[0].is_active).toBe(false)
  })

  it('ações administrativas respeitam o tipo do registro', () => {
    expect(allowedActions({ kind: 'invite', is_orphan: false })).toMatchObject({ impersonate: false, delete: false, changePlan: false, resetPassword: false })
    expect(allowedActions({ kind: 'member', is_orphan: false })).toMatchObject({ impersonate: true, changePlan: false, toggleActive: false, delete: true })
    expect(allowedActions({ kind: 'member', is_orphan: true })).toMatchObject({ impersonate: false, forceLogout: false, delete: true })
    expect(allowedActions({ kind: 'master', is_orphan: false })).toMatchObject({ impersonate: true, changePlan: true, delete: true })
  })

  it('identifica e-mails sintéticos de equipe', () => {
    expect(isSyntheticTeamEmail('x.abc@team.agentesdesonhos.local')).toBe(true)
    expect(isSyntheticTeamEmail('vendas@paraisoviagens.com')).toBe(false)
    expect(isSyntheticTeamEmail(null)).toBe(false)
  })
})
