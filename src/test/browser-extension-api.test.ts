import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ACTIONS, escapeIlike, ilikeContainsPattern, mergeContactMatches, phoneMatchVariants,
  assertAction, assertCanMoveStage, budgetSentNote, clampInt, filterVisibleStages,
  assertPermissionReadOk, assertTeamMembershipBinding, teamPermissionFilter,
  isUsablePhone, isUuid, normalizePhone, publicContact, publicOpportunity, safeAmount,
  safeHttpUrl, safeText, validateDestination, validateIsoDate, validateName,
  APP_BASE_URL, DEFAULT_TIME_ZONE, agendaDeepLink, buildOpportunityUpdate, civilDateInTimeZone,
  civilDayWindow, civilTimeInTimeZone, clampLimit, clientDeepLink, createQuoteDeepLink,
  opportunityDeepLink, publicCompany, publicFollowup, publicOperation, assertTravelContextPair,
  validateFollowupFilter, validateIsoDateTime, validateRelationshipType, validateTimeZone,
  validateTravelContext,
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
  const src = readFileSync(resolve(process.cwd(), 'supabase/functions/browser-extension-api/index.ts'), 'utf8')
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
    expect(/(?<!admin)(?<!adminRead)\bclient\s*\n?\s*\.from\("clients"\)/.test(src)).toBe(true)
    expect(/(?<!admin)(?<!adminRead)\bclient\s*\n?\s*\.from\("opportunities"\)/.test(src)).toBe(true)
  })
})

describe('search_contacts (v0.3)', () => {
  it('a action está no allowlist', () => {
    expect(ACTIONS).toContain('search_contacts')
    expect(assertAction('search_contacts')).toBeNull()
  })

  it('escapa curingas do ilike e monta busca parcial', () => {
    expect(escapeIlike('100% _ok\\')).toBe('100\\% \\_ok\\\\')
    expect(ilikeContainsPattern('ana')).toBe('%ana%')
    expect(ilikeContainsPattern('50%_')).toBe('%50\\%\\_%')
  })

  it('deduplica por id, telefone primeiro, e limita a 10', () => {
    const phone = [{ id: 'a' }, { id: 'b' }]
    const name = [{ id: 'b' }, { id: 'c' }]
    expect(mergeContactMatches(phone, name).map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(mergeContactMatches(null, null)).toEqual([])
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `id-${i}` }))
    expect(mergeContactMatches(many, many, 10)).toHaveLength(10)
  })

  const src = readFileSync(resolve(process.cwd(), 'supabase/functions/browser-extension-api/index.ts'), 'utf8')
  const block = src.slice(src.indexOf('case "search_contacts"'), src.indexOf('case "create_contact"'))

  it('exige permissão clients.view e validação mínima', () => {
    expect(block).toContain('requirePermission("clients.view")')
    expect(block).toContain('name.length < 2')
    expect(block).toContain('status: 400')
  })

  it('isola por agência em toda consulta e nunca confia no body', () => {
    const froms = [...block.matchAll(/\.from\("clients"\)/g)]
    const eqs = [...block.matchAll(/\.eq\("user_id", agencyId\)/g)]
    expect(froms.length).toBe(2)
    expect(eqs.length).toBe(froms.length)
    expect(block).not.toMatch(/body\.(agencyId|userId|teamMemberId|memberId)/)
    expect(block).toMatch(/client\s*\n?\s*\.from\("clients"\)/)
    expect(block).not.toContain('adminRead')
  })

  it('devolve apenas contatos mascarados, limitados a 10', () => {
    expect(block).toContain('publicContact(r)')
    expect(block).toContain('mergeContactMatches(phoneRows, nameRows, 10)')
    expect(block).not.toMatch(/cpf|cnpj|notes/i)
    expect(block).toContain('.limit(10)')
  })

  it('compara telefone por variantes com e sem 55', () => {
    expect(block).toContain('phoneMatchVariants(digits)')
    expect(block).toContain('.in("phone_normalized", phoneVariants)')
    expect(block).not.toContain('.eq("phone_normalized", digits)')
  })

  it('mantém a prioridade do telefone antes do nome', () => {
    expect(block.indexOf('phoneRows =')).toBeLessThan(block.indexOf('nameRows ='))
    expect(block).toContain('mergeContactMatches(phoneRows, nameRows, 10)')
  })
})

describe('phoneMatchVariants', () => {
  it('celular local ↔ com código do país', () => {
    expect(phoneMatchVariants('11999999999')).toEqual(['11999999999', '5511999999999'])
    expect(phoneMatchVariants('5511999999999')).toEqual(['5511999999999', '11999999999'])
  })
  it('fixo de 10 dígitos ↔ 12 com 55', () => {
    expect(phoneMatchVariants('1134210212')).toEqual(['1134210212', '551134210212'])
    expect(phoneMatchVariants('551134210212')).toEqual(['551134210212', '1134210212'])
  })
  it('não inventa variantes para outros países', () => {
    expect(phoneMatchVariants('14155552671')).toEqual(['14155552671', '5514155552671'])
    expect(phoneMatchVariants('447911123456')).toEqual(['447911123456'])
    expect(phoneMatchVariants('4479111234567')).toEqual(['4479111234567'])
  })
  it('deduplica e recusa inválidos', () => {
    expect(new Set(phoneMatchVariants('11999999999')).size).toBe(2)
    expect(phoneMatchVariants('')).toEqual([])
    expect(phoneMatchVariants('1234')).toEqual([])
    expect(phoneMatchVariants('1234567890123456')).toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Piloto 0.4
// ════════════════════════════════════════════════════════════════════════════

describe('0.4 · fuso e timestamp de follow-up', () => {
  it('aceita fusos válidos e cai no padrão seguro', () => {
    expect(validateTimeZone('America/Sao_Paulo')).toBe('America/Sao_Paulo')
    expect(validateTimeZone('Europe/Lisbon')).toBe('Europe/Lisbon')
    expect(validateTimeZone('Marte/Olympus')).toBe(DEFAULT_TIME_ZONE)
    expect(validateTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE)
    expect(validateTimeZone(42)).toBe(DEFAULT_TIME_ZONE)
  })

  it('exige offset explícito no ISO 8601', () => {
    expect(validateIsoDateTime('2026-08-20T14:30:00-03:00')).toBeTruthy()
    expect(validateIsoDateTime('2026-08-20T17:30:00Z')).toBeTruthy()
    // Sem fuso o horário é ambíguo: recusar.
    expect(validateIsoDateTime('2026-08-20T14:30:00')).toBeNull()
    expect(validateIsoDateTime('2026-08-20')).toBeNull()
    expect(validateIsoDateTime('amanhã às 14h')).toBeNull()
    expect(validateIsoDateTime(null)).toBeNull()
  })

  it('deriva a data civil pelo fuso, sem shift de UTC', () => {
    // 23:30 em São Paulo = 02:30 UTC do dia seguinte. O dia civil é o day 20.
    expect(civilDateInTimeZone('2026-08-21T02:30:00Z', 'America/Sao_Paulo')).toBe('2026-08-20')
    expect(civilDateInTimeZone('2026-08-21T02:30:00Z', 'UTC')).toBe('2026-08-21')
    expect(civilTimeInTimeZone('2026-08-21T02:30:00Z', 'America/Sao_Paulo')).toBe('23:30')
  })

  it('janela do dia civil respeita o horizonte', () => {
    const win = civilDayWindow('America/Sao_Paulo', 7, new Date('2026-08-20T12:00:00Z'))
    expect(win.today).toBe('2026-08-20')
    expect(win.horizon_date).toBe('2026-08-27')
    expect(win.time_zone).toBe('America/Sao_Paulo')
  })
})

describe('0.4 · allowlist de ações', () => {
  const novas = [
    'dashboard_today', 'get_contact_summary', 'update_opportunity',
    'list_followups', 'update_followup', 'complete_followup',
    'list_companies', 'search_companies', 'create_company',
    'link_contact_company', 'unlink_contact_company', 'list_contact_companies',
    'list_opportunity_quotes', 'list_opportunity_operations',
  ]

  it('inclui as ações 0.4 e preserva as 0.3', () => {
    novas.forEach(a => expect(ACTIONS).toContain(a))
    ;['context', 'lookup_contact', 'create_followup'].forEach(a => expect(ACTIONS).toContain(a))
    expect(assertAction('dashboard_today')).toBeNull()
    expect(assertAction('send_whatsapp')?.status).toBe(400)
    expect(assertAction('drop_table')?.status).toBe(400)
  })

  it('cada ação nova tem handler no index.ts', () => {
    const src = readFileSync(resolve(__dirname, '../../supabase/functions/browser-extension-api/index.ts'), 'utf8')
    novas.forEach(a => expect(src).toContain(`case "${a}"`))
  })
})

describe('0.4 · filtros e vínculos', () => {
  it('valida filtro de follow-up', () => {
    expect(validateFollowupFilter('overdue')).toBe('overdue')
    expect(validateFollowupFilter('today')).toBe('today')
    expect(validateFollowupFilter('upcoming')).toBe('upcoming')
    expect(validateFollowupFilter('all')).toBe('all')
    // Filtro desconhecido cai no dia corrente (menor payload possível).
    expect(validateFollowupFilter('qualquer')).toBe('today')
  })

  it('valida tipo de relacionamento com empresa', () => {
    expect(validateRelationshipType('owner')).toBe('owner')
    expect(validateRelationshipType('inventado')).toBe('other')
  })

  it('contexto de viagem exige coerência com empresa', () => {
    expect(validateTravelContext('corporate')).toBe('corporate')
    expect(validateTravelContext('bogus')).toBeNull()
    expect(assertTravelContextPair('corporate', null)?.status).toBe(400)
    expect(assertTravelContextPair('personal', S1)?.status).toBe(400)
    expect(assertTravelContextPair('corporate', S1)).toBeNull()
    expect(assertTravelContextPair('personal', null)).toBeNull()
  })

  it('clampLimit nunca ultrapassa o teto', () => {
    expect(clampLimit(999, 20, 50)).toBe(50)
    expect(clampLimit(undefined, 20, 50)).toBe(20)
    expect(clampLimit(5, 20, 50)).toBe(5)
    expect(clampLimit(-3, 20, 50)).toBe(20)
  })
})

describe('0.4 · payload mínimo e privacidade', () => {
  it('empresa nunca devolve CNPJ bruto', () => {
    const company = publicCompany({
      id: S1, name: 'Acme Viagens', trade_name: 'Acme',
      cnpj_normalized: '12345678000199', email: 'a@b.com', phone: '11999999999',
      notes: 'segredo interno', created_at: '2026-01-01',
    })
    const raw = JSON.stringify(company)
    expect(raw).not.toContain('12345678000199')
    expect(raw).not.toContain('segredo interno')
    expect(company!.cnpj_masked).toMatch(/\d{4}$/)
  })

  it('follow-up expõe data, horário e fuso', () => {
    const fu = publicFollowup({
      id: S1, opportunity_id: S2, follow_up_date: '2026-08-20',
      follow_up_at: '2026-08-20T17:30:00Z', time_zone: 'America/Sao_Paulo',
      note: 'ligar', created_at: '2026-08-01',
    })
    expect(fu.follow_up_date).toBe('2026-08-20')
    expect(fu.follow_up_at).toBe('2026-08-20T17:30:00Z')
    expect(fu.time_zone).toBe('America/Sao_Paulo')
  })

  it('operações e viagens não trazem dados financeiros', () => {
    const op = publicOperation({
      id: S1, title: 'Viagem', destination: 'Lisboa', travel_start_date: '2026-09-01',
      travel_end_date: '2026-09-10', passengers_count: 2, stage: 'negociacao',
      total_value: 55000, commission_amount: 3000,
    })
    const raw = JSON.stringify(op)
    expect(raw).not.toContain('55000')
    expect(raw).not.toContain('3000')
  })
})

describe('0.4 · deep links calculados no servidor', () => {
  it('usa a base fixa do app, nunca uma URL do body', () => {
    expect(clientDeepLink(S1)).toBe(`${APP_BASE_URL}/gestao-clientes/clientes?client=${S1}`)
    expect(opportunityDeepLink(S1)).toBe(`${APP_BASE_URL}/gestao-clientes/funil?opportunity=${S1}`)
    expect(createQuoteDeepLink(S1)).toBe(`${APP_BASE_URL}/ferramentas-ia/gerar-orcamento?opportunity=${S1}`)
    expect(agendaDeepLink('2026-08-20')).toContain(`${APP_BASE_URL}/agenda`)
    expect(APP_BASE_URL.startsWith('https://')).toBe(true)
  })

  it('recusa id inválido em vez de montar link quebrado', () => {
    expect(clientDeepLink('nao-uuid' as string)).toBeNull()
    expect(opportunityDeepLink('' as string)).toBeNull()
    expect(createQuoteDeepLink('1' as string)).toBeNull()
  })
})

describe('0.4 · buildOpportunityUpdate', () => {
  it('aceita somente colunas reais e sanitiza', () => {
    const { patch, error } = buildOpportunityUpdate({
      destination: 'Lisboa', estimatedValue: '9.999,50', notes: 'nota',
      adultsCount: 2, childrenCount: 1, stage: 'hack', user_id: 'hack',
    })
    expect(error).toBeNull()
    expect(patch.destination).toBe('Lisboa')
    expect(patch.adults_count).toBe(2)
    expect(patch.children_count).toBe(1)
    expect(patch.passengers_count).toBe(3)
    expect(patch).not.toHaveProperty('stage')
    expect(patch).not.toHaveProperty('user_id')
  })

  it('recusa patch vazio e contexto corporativo sem empresa', () => {
    expect(buildOpportunityUpdate({}).error?.status).toBe(400)
    expect(buildOpportunityUpdate({ travelContext: 'corporate' }).error?.status).toBe(400)
    const ok = buildOpportunityUpdate({ travelContext: 'corporate', companyId: S1 })
    expect(ok.error).toBeNull()
    expect(ok.patch.company_id).toBe(S1)
  })
})

describe('0.4 · isolamento no index.ts', () => {
  const src = readFileSync(resolve(__dirname, '../../supabase/functions/browser-extension-api/index.ts'), 'utf8')

  it('dashboard_today usa follow-ups do próprio usuário', () => {
    const block = src.slice(src.indexOf('case "dashboard_today"'), src.indexOf('case "get_contact_summary"'))
    expect(block).toContain('.eq("created_by", user.id)')
    expect(block).toContain('.eq("user_id", agencyId)')
    expect(block).toContain('.is("deleted_at", null)')
    expect(block).not.toMatch(/total_value|commission/i)
  })

  it('adminRead/service role não toca nas tabelas novas', () => {
    const adminUses = src.match(/adminRead[\s\S]{0,200}?from\("([a-z_]+)"/g) ?? []
    adminUses.forEach(u => {
      expect(u).not.toContain('companies')
      expect(u).not.toContain('client_companies')
      expect(u).not.toContain('opportunity_followups')
      expect(u).not.toContain('agency_events')
    })
  })

  it('mutações de empresa exigem permissão de clientes', () => {
    const block = src.slice(src.indexOf('case "create_company"'), src.indexOf('case "link_contact_company"'))
    expect(block).toContain('requirePermission("clients.create")')
    const link = src.slice(src.indexOf('case "link_contact_company"'), src.indexOf('case "unlink_contact_company"'))
    expect(link).toContain('requirePermission("clients.edit")')
    expect(link).toContain('.eq("user_id", agencyId)')
  })
})
