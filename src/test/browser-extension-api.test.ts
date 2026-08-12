import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  assertAction, assertCanMoveStage, budgetSentNote, clampInt, filterVisibleStages,
  assertPermissionReadOk, assertTeamMembershipBinding, teamPermissionFilter,
  isUsablePhone, isUuid, normalizePhone, publicContact, publicOpportunity, safeAmount,
  safeHttpUrl, safeText, validateDestination, validateIsoDate, validateName,
} from '../../supabase/functions/_shared/extensionBridge'

const S1 = '11111111-1111-4111-8111-111111111111'
const S2 = '22222222-2222-4222-8222-222222222222'
const AG = '33333333-3333-4333-8333-333333333333'

describe('normalização de telefone', () => {
  it('mantém apenas dígitos', () => {
    expect(normalizePhone('+55 (35) 99954-0212')).toBe('5535999540212')
    expect(normalizePhone(null)).toBe('')
    expect(normalizePhone('abc')).toBe('')
  })
  it('aceita apenas comprimentos plausíveis', () => {
    expect(isUsablePhone('35999540212')).toBe(true)
    expect(isUsablePhone('1234')).toBe(false)
    expect(isUsablePhone('1234567890123456')).toBe(false)
  })
})

describe('validações de entrada', () => {
  it('exige nome com pelo menos 2 caracteres e remove tags', () => {
    expect(validateName('<b>Ana</b> Paula')).toEqual({ valid: true, value: 'Ana Paula' })
    expect(validateName('A').valid).toBe(false)
  })
  it('exige destino', () => {
    expect(validateDestination(' Orlando ')).toEqual({ valid: true, value: 'Orlando' })
    expect(validateDestination('').valid).toBe(false)
  })
  it('valida datas AAAA-MM-DD reais', () => {
    expect(validateIsoDate('2026-08-12')).toBe('2026-08-12')
    expect(validateIsoDate('2026-02-30')).toBeNull()
    expect(validateIsoDate('12/08/2026')).toBeNull()
  })
  it('limita inteiros e valores', () => {
    expect(clampInt('4', 1, 199, 1)).toBe(4)
    expect(clampInt('abc', 1, 199, 2)).toBe(2)
    expect(clampInt(500, 1, 199, 1)).toBe(199)
    expect(safeAmount(-5)).toBe(0)
    expect(safeAmount('1200.5')).toBe(1200.5)
  })
  it('aceita apenas URLs http/https', () => {
    expect(safeHttpUrl('https://app.exemplo/orcamento/abc')).toBe('https://app.exemplo/orcamento/abc')
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
  })
  it('rejeita ações desconhecidas', () => {
    expect(assertAction('context')).toBeNull()
    expect(assertAction('drop_table')?.status).toBe(400)
  })
  it('corta texto no limite', () => {
    expect(safeText('a'.repeat(300), 10)).toHaveLength(10)
  })
  it('valida uuid', () => {
    expect(isUuid(S1)).toBe(true)
    expect(isUuid('nope')).toBe(false)
  })
})

describe('guarda de movimentação de etapa', () => {
  it('master move sempre', () => {
    expect(assertCanMoveStage({ isTeamMember: false, fromStageId: S1, toStageId: S2, permissions: [] })).toBeNull()
  })
  it('colaborador precisa de can_move na origem e no destino', () => {
    const both = [{ stage_id: S1, can_move: true }, { stage_id: S2, can_move: true }]
    expect(assertCanMoveStage({ isTeamMember: true, fromStageId: S1, toStageId: S2, permissions: both })).toBeNull()
    const onlyTarget = [{ stage_id: S2, can_move: true }]
    expect(assertCanMoveStage({ isTeamMember: true, fromStageId: S1, toStageId: S2, permissions: onlyTarget })?.status).toBe(403)
  })
  it('nega quando não há registro de etapa (fail-closed)', () => {
    expect(assertCanMoveStage({ isTeamMember: true, fromStageId: null, toStageId: S2, permissions: [] })?.status).toBe(403)
  })
  it('nega destino inválido', () => {
    expect(assertCanMoveStage({ isTeamMember: false, fromStageId: null, toStageId: 'x', permissions: [] })?.status).toBe(400)
  })
})

describe('etapas visíveis', () => {
  const stages = [{ id: S1, name: 'Novo' }, { id: S2, name: 'Orçamento' }]
  it('master vê todas com true', () => {
    const out = filterVisibleStages(stages, false, [])
    expect(out).toHaveLength(2)
    expect(out[0].can_move).toBe(true)
  })
  it('colaborador vê apenas can_view', () => {
    const out = filterVisibleStages(stages, true, [{ stage_id: S2, can_view: true, can_edit: false, can_move: false }])
    expect(out.map(s => s.id)).toEqual([S2])
    expect(out[0].can_edit).toBe(false)
  })
})

describe('payloads mínimos', () => {
  it('nunca vaza campos sensíveis do contato', () => {
    const out = publicContact({ id: S1, name: 'Ana', phone: '35999540212', cpf: '000', internal_notes: 'x' } as Record<string, unknown>)
    expect(Object.keys(out!)).toEqual(['id', 'name', 'phone', 'email', 'status', 'created_at'])
  })
  it('resolve nome da etapa da oportunidade', () => {
    const out = publicOpportunity({ id: S2, destination: 'Orlando', stage_id: S1, pipeline_stage: { name: 'Orçamento enviado', legacy_key: 'quote_sent' } })
    expect(out.stage_name).toBe('Orçamento enviado')
    expect(out.stage_legacy_key).toBe('quote_sent')
  })
  it('nota de orçamento inclui URL só quando existe', () => {
    expect(budgetSentNote(null)).toBe('Orçamento enviado pelo WhatsApp.')
    expect(budgetSentNote('https://x/y')).toContain('https://x/y')
  })
})

describe('vínculo triplo do colaborador', () => {
  const base = { teamMemberId: S1, authUserId: S2, agencyId: AG }
  const row = { id: S1, auth_user_id: S2, agency_id: AG, status: 'active' }
  it('aceita exatamente uma linha coerente e ativa', () => {
    expect(assertTeamMembershipBinding({ ...base, rows: [row] })).toBeNull()
  })
  it('nega quando não há linha, há mais de uma, ou está inativo', () => {
    expect(assertTeamMembershipBinding({ ...base, rows: [] })?.status).toBe(403)
    expect(assertTeamMembershipBinding({ ...base, rows: null })?.status).toBe(403)
    expect(assertTeamMembershipBinding({ ...base, rows: [row, row] })?.status).toBe(403)
    expect(assertTeamMembershipBinding({ ...base, rows: [{ ...row, status: 'blocked' }] })?.status).toBe(403)
  })
  it('nega quando auth user ou agência divergem', () => {
    expect(assertTeamMembershipBinding({ ...base, rows: [{ ...row, auth_user_id: AG }] })?.status).toBe(403)
    expect(assertTeamMembershipBinding({ ...base, rows: [{ ...row, agency_id: S2 }] })?.status).toBe(403)
    expect(assertTeamMembershipBinding({ ...base, rows: [{ ...row, id: S2 }] })?.status).toBe(403)
  })
})

describe('leitura de permissões fail-closed', () => {
  it('erro de banco vira negação, nunca array vazio silencioso', () => {
    expect(assertPermissionReadOk(null, undefined)).toBeNull()
    expect(assertPermissionReadOk(null, { message: 'boom' })?.status).toBe(403)
  })
  it('filtro exige agency_id e team_member_id derivados', () => {
    expect(teamPermissionFilter(AG, S1)).toEqual({ agency_id: AG, team_member_id: S1 })
    expect(() => teamPermissionFilter('x', S1)).toThrow()
  })
})

describe('garantias de fonte da Edge Function', () => {
  const src = readFileSync(
    new URL('../../supabase/functions/browser-extension-api/index.ts', import.meta.url),
    'utf8',
  )
  const adminBlock = src.slice(src.indexOf('const adminRead'), src.indexOf('const can = ('))

  it('service client só toca as três tabelas de equipe', () => {
    const tables = [...adminBlock.matchAll(/adminRead\s*\n?\s*\.from\("([a-z_]+)"\)/g)].map(m => m[1])
    expect(tables.length).toBeGreaterThanOrEqual(3)
    expect(new Set(tables)).toEqual(new Set([
      'agency_team_members', 'agency_team_permissions', 'agency_team_stage_permissions',
    ]))
  })
  it('service client nunca executa mutação nem lê CRM', () => {
    expect(/adminRead[\s\S]{0,200}\.(insert|update|upsert|delete)\(/.test(src)).toBe(false)
    expect(/adminRead\s*\n?\s*\.from\("(clients|opportunities|pipeline_stages|opportunity_\w+)"\)/.test(src)).toBe(false)
  })
  it('permissões são lidas sempre filtrando agency_id e team_member_id', () => {
    for (const table of ['agency_team_permissions', 'agency_team_stage_permissions']) {
      const chunk = adminBlock.slice(adminBlock.indexOf(`"${table}"`))
      expect(chunk).toContain('.eq("agency_id", scope.agency_id)')
      expect(chunk).toContain('.eq("team_member_id", scope.team_member_id)')
    }
    expect(adminBlock).not.toMatch(/body\.(teamMemberId|agencyId|memberId|userId)/)
  })
  it('valida o vínculo triplo antes de ler permissões', () => {
    expect(adminBlock.indexOf('assertTeamMembershipBinding'))
      .toBeLessThan(adminBlock.indexOf('agency_team_permissions'))
  })
  it('CRM continua no client do JWT', () => {
    expect(src).toContain('client.from("clients")')
    expect(src).toContain('client.from("opportunities")')
  })
})
