import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  assertPlatformAdmin, assertTargetAgencyId, assertAgencyExists, assertTargetInAgency,
  assertNotAgencyOwner, assertNoOwnershipTransfer, filterPermissionKeys, filterScopes,
  assertProfileUsable, assertProfileEditable, validateLimitOverride, buildAuditEntry,
  sanitizeRow, sanitizeRows, safeText, auditMessage,
} from '../../supabase/functions/_shared/agencyTeamGuards'

const AGENCY = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

describe('validação de administrador e agência alvo', () => {
  it('bloqueia quem não é admin da plataforma', () => {
    expect(assertPlatformAdmin(false)?.status).toBe(403)
    expect(assertPlatformAdmin(true)).toBeNull()
  })

  it('exige target_agency_id em formato UUID', () => {
    expect(assertTargetAgencyId(undefined)?.status).toBe(400)
    expect(assertTargetAgencyId('minha-agencia')?.status).toBe(400)
    expect(assertTargetAgencyId(AGENCY)).toBeNull()
  })

  it('recusa agência inexistente e colaborador informado como agência', () => {
    expect(assertAgencyExists(null, false)?.status).toBe(404)
    expect(assertAgencyExists({ id: AGENCY }, true)?.status).toBe(400)
    expect(assertAgencyExists({ id: AGENCY }, false)).toBeNull()
  })
})

describe('isolamento entre agências', () => {
  it('impede acessar registro de outra agência', () => {
    expect(assertTargetInAgency(OTHER, AGENCY)?.status).toBe(403)
    expect(assertTargetInAgency(null, AGENCY)?.status).toBe(404)
    expect(assertTargetInAgency(AGENCY, AGENCY)).toBeNull()
  })

  it('nunca trata o proprietário como colaborador', () => {
    expect(assertNotAgencyOwner(AGENCY, AGENCY)?.status).toBe(400)
    expect(assertNotAgencyOwner(OTHER, AGENCY)).toBeNull()
  })

  it('bloqueia tentativa de transferir a propriedade', () => {
    expect(assertNoOwnershipTransfer({ agency_id: OTHER })?.status).toBe(400)
    expect(assertNoOwnershipTransfer({ transfer_ownership: true })?.status).toBe(400)
    expect(assertNoOwnershipTransfer({ full_name: 'Ana' })).toBeNull()
  })

  it('valida perfis de acesso por agência', () => {
    expect(assertProfileUsable({ id: 'p', agency_id: OTHER }, AGENCY)?.status).toBe(403)
    expect(assertProfileUsable({ id: 'p', agency_id: null, key: 'owner' }, AGENCY)?.status).toBe(400)
    expect(assertProfileUsable({ id: 'p', agency_id: null, key: 'vendedor' }, AGENCY)).toBeNull()
    expect(assertProfileEditable({ agency_id: null, is_native: true }, AGENCY)?.status).toBe(400)
    expect(assertProfileEditable({ agency_id: AGENCY, is_native: false }, AGENCY)).toBeNull()
  })
})

describe('catálogo de permissões e escopos', () => {
  const catalog = ['clients.view', 'clients.edit', 'team.manage']

  it('descarta chaves fora do catálogo e remove duplicidades', () => {
    expect(filterPermissionKeys(['clients.view', 'clients.view', 'hack.all'], catalog))
      .toEqual(['clients.view'])
    expect(filterPermissionKeys('clients.view', catalog)).toEqual([])
  })

  it('aceita apenas escopos válidos', () => {
    expect(filterScopes({ clients: 'agency', finance: 'planeta' })).toEqual({ clients: 'agency' })
    expect(filterScopes(['agency'])).toEqual({})
  })
})

describe('limite administrativo de acessos', () => {
  it('exige inteiro válido e motivo', () => {
    expect(validateLimitOverride({ max_members: 0, reason: 'cortesia', seatsUsed: 1 }).error?.status).toBe(400)
    expect(validateLimitOverride({ max_members: 5, reason: 'ok', seatsUsed: 1 }).error?.status).toBe(400)
  })

  it('avisa quando o limite fica abaixo do uso, sem desativar ninguém', () => {
    const res = validateLimitOverride({ max_members: 2, reason: 'ajuste comercial', seatsUsed: 5 })
    expect(res.error).toBeUndefined()
    expect(res.max_members).toBe(2)
    expect(res.warning).toContain('Nenhum colaborador foi desativado')
  })
})

describe('auditoria', () => {
  it('marca explicitamente o administrador da plataforma', () => {
    const entry = buildAuditEntry({
      agencyId: AGENCY, actorUserId: OTHER, isPlatformAdmin: true,
      action: 'create_member', subject: 'Ana', agencyName: 'Viagens Ltda',
    })
    expect(entry.actor_is_platform_admin).toBe(true)
    expect(entry.agency_id).toBe(AGENCY)
    expect((entry.details as any).origin).toBe('admin_global')
    expect((entry.details as any).message)
      .toBe('Administrador da plataforma criou o colaborador Ana na agência Viagens Ltda.')
  })

  it('mantém o rótulo do proprietário no fluxo da agência', () => {
    expect(auditMessage({ action: 'invite_revoked', isPlatformAdmin: false }))
      .toBe('Proprietário da agência revogou um convite.')
  })
})

describe('sanitização de dados devolvidos ao navegador', () => {
  it('remove segredos de linhas e listas', () => {
    const row = sanitizeRow({ id: '1', login: 'ana', password_hash: 'x', token_hash: 'y' })
    expect(row).toEqual({ id: '1', login: 'ana' })
    expect(sanitizeRows([{ id: '1', secret: 'z' }])).toEqual([{ id: '1' }])
    expect(sanitizeRows(null)).toEqual([])
  })

  it('limpa e limita textos livres', () => {
    expect(safeText('  Ana\u0000 Maria  ')).toBe('Ana  Maria')
    expect(safeText('', 10)).toBeNull()
    expect(safeText('abcdefghij', 4)).toBe('abcd')
  })
})

describe('Edge Function admin-agency-teams', () => {
  const src = readFileSync('supabase/functions/admin-agency-teams/index.ts', 'utf-8')

  it('valida sessão e papel admin antes de qualquer ação', () => {
    expect(src).toContain('getClaims')
    expect(src).toContain("admin.rpc('has_role'")
    expect(src).toContain('assertPlatformAdmin')
  })

  it('exige agência alvo para todas as ações por agência', () => {
    expect(src).toContain('assertTargetAgencyId(body.target_agency_id)')
    expect(src).toContain('assertAgencyExists')
  })

  it('expõe as ações necessárias de gestão global', () => {
    for (const action of [
      'stats', 'agencies', 'agency_detail', 'quota', 'members', 'member_detail',
      'member_scopes', 'stages', 'invites', 'access_profiles', 'audit',
      'community_get', 'community_save', 'limit_override_set', 'limit_override_clear',
    ]) {
      expect(src).toContain(`'${action}'`)
    }
  })

  it('nunca devolve segredos e sempre audita como admin global', () => {
    expect(src).toContain('sanitizeRows')
    expect(src).toContain('isPlatformAdmin: true')
    expect(src).not.toMatch(/token_hash\s*,/)
  })
})