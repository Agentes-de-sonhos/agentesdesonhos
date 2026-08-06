import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

const migrations = readdirSync('supabase/migrations')
  .filter(f => f.endsWith('.sql'))
  .sort()
const latestTeamMigration = migrations
  .map(f => ({ f, sql: readFileSync(`supabase/migrations/${f}`, 'utf8') }))
  .filter(m => m.sql.includes('team_members_overview'))
  .pop()!

describe('migration das RPCs de equipe', () => {
  const sql = latestTeamMigration.sql

  it('autoriza proprietário ou colaborador com team.manage via helper seguro', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.team_can_manage_team()')
    expect(sql).toContain("public.can_team('team.manage')")
    for (const fn of ['team_members_overview', 'team_list_invites', 'team_member_scopes', 'team_get_member_detail']) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${fn}`)
    }
    expect(sql.match(/public\.team_can_manage_team\(\)/g)!.length).toBeGreaterThanOrEqual(5)
  })

  it('sempre filtra pela agência efetiva user_agency_id(auth.uid())', () => {
    expect(sql.match(/public\.user_agency_id\(auth\.uid\(\)\)/g)!.length).toBeGreaterThanOrEqual(4)
  })

  it('mantém SECURITY DEFINER, search_path fixo e EXECUTE restrito', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain("SET search_path TO 'public'")
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.team_members_overview() TO authenticated, service_role;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.team_get_member_detail(uuid) FROM PUBLIC;')
    expect(sql).not.toContain('TO PUBLIC')
    expect(sql).not.toContain('TO anon')
  })

  it('libera comunidade para team.manage e audita o ator real', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.agency_community_settings_save')
    expect(sql).toContain('NOT public.team_can_manage_team()')
    expect(sql).toContain('_agency := public.user_agency_id(auth.uid())')
    expect(sql).toContain("VALUES (_agency, auth.uid(), 'community_settings_update'")
  })

  it('lista administrativa parte de profiles.user_id e é restrita ao service_role', () => {
    expect(sql).toContain('FROM public.profiles p')
    expect(sql).toContain('SELECT p.user_id AS id')
    expect(sql).toContain('LEFT JOIN auth.users u ON u.id = p.user_id')
    expect(sql).toContain('WHERE m.auth_user_id = p.user_id')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_agency_teams_list(text, text, text, boolean, boolean, integer, integer) TO service_role;')
  })
})

describe('Edge Function admin-agency-teams — listagem global', () => {
  const fn = readFileSync('supabase/functions/admin-agency-teams/index.ts', 'utf8')
  const agencies = fn.slice(fn.indexOf("if (action === 'agencies')"), fn.indexOf('// ── A partir daqui'))

  it('parte de todos os perfis proprietários e exclui colaboradores', () => {
    expect(agencies).toContain("admin.from('profiles')")
    expect(agencies).toContain("select('user_id, name, agency_name')")
    expect(agencies).toContain('subuserIds.has(p.user_id)')
  })

  it('inclui agências sem equipe por padrão', () => {
    expect(agencies).toContain("teamFilter === 'without'")
    expect(agencies).toContain("teamFilter === 'with' && !hasTeam")
    // sem filtro de equipe nada é descartado por ausência de membros
    expect(agencies).not.toContain('memberAgg.has(id) === false) return')
  })

  it('resolve e-mails em lote com listUsers, sem getUserById por linha', () => {
    expect(agencies).toContain('admin.auth.admin.listUsers({ page: p, perPage: 1000 })')
    expect(agencies).not.toContain('getUserById')
    expect(agencies).not.toMatch(/for \(const .* of .*\) \{[^}]*auth\.admin/)
  })

  it('busca por nome da agência, responsável, e-mail e UUID', () => {
    expect(agencies).toContain('r.agency_name.toLowerCase().includes(term)')
    expect(agencies).toContain("(r.owner_name ?? '').toLowerCase().includes(term)")
    expect(agencies).toContain("(r.owner_email ?? '').toLowerCase().includes(term)")
    expect(agencies).toContain('r.agency_id.toLowerCase() === term')
  })

  it('aplica filtros antes do total e da paginação', () => {
    expect(agencies.indexOf('const filtered = all.filter')).toBeLessThan(agencies.indexOf('filtered.slice(start'))
    expect(agencies).toContain('total: filtered.length')
    expect(agencies).toContain('atLimitOnly && r.seats_used < r.seats_limit')
    expect(agencies).toContain('pendingOnly && r.pending_invites < 1')
  })

  it('resolve limites e planos em lote (sem N consultas)', () => {
    expect(agencies).toContain("admin.from('plan_team_limits')")
    expect(agencies).toContain("admin.from('agency_team_limit_overrides')")
    expect(agencies).toContain("admin.from('subscriptions')")
  })

  it('não usa fallback de UUID e pula a consulta quando a lista está vazia', () => {
    expect(fn).not.toContain("['x']")
    expect(fn).not.toContain('NIL_UUID')
    expect(fn).toContain("const ids = uuidList((data ?? []).map((m: any) => m.id))")
    expect(fn).toContain('const [{ data: perms }, { data: stages }] = ids.length')
    expect(fn).toContain('[{ data: [] as any[] }, { data: [] as any[] }]')
    expect(fn).toContain("? await admin.from('agency_team_members').select('id, full_name').in('id', ids)")
    expect(fn).toContain(': { data: [] as any[] }')
  })
})

describe('team-admin — guardas do fluxo administrativo global', () => {
  const fn = readFileSync('supabase/functions/team-admin/index.ts', 'utf8')

  it('valida chaves de permissão pelo catálogo', () => {
    expect(fn).toMatch(/team_permission_catalog/)
    expect(fn).toContain('if (!catalog.has(key)) continue')
  })

  it('exige perfil nativo ou da agência alvo e isolamento por agência', () => {
    expect(fn).toContain("member.agency_id !== ownerId")
    expect(fn).toContain('is_native')
    expect(fn).toContain("if (data.agency_id && data.agency_id !== ownerId) return null")
  })

  it('nunca edita o proprietário nem transfere propriedade', () => {
    expect(fn).toContain('assertNotAgencyOwner')
    expect(fn).toContain('assertNoOwnershipTransfer')
  })

  it('audita como admin da plataforma com origem admin_global', () => {
    expect(fn).toContain('isPlatformAdmin = true')
    expect(fn).toContain('buildAuditEntry({')
    const guards = readFileSync('supabase/functions/_shared/agencyTeamGuards.ts', 'utf8')
    expect(guards).toContain('actor_is_platform_admin: input.isPlatformAdmin')
    expect(guards).toContain("origin: input.isPlatformAdmin ? 'admin_global' : 'agency'")
  })
})

describe('interface — correções obrigatórias', () => {
  const minhaConta = readFileSync('src/pages/MinhaConta.tsx', 'utf8')
  const center = readFileSync('src/components/team/TeamManagementCenter.tsx', 'utf8')
  const adminMgr = readFileSync('src/components/admin/AdminAgencyTeamsManager.tsx', 'utf8')
  const invites = readFileSync('src/components/team/TeamInvitesList.tsx', 'utf8')
  const auditView = readFileSync('src/components/team/TeamAuditLogView.tsx', 'utf8')
  const hook = readFileSync('src/hooks/useTeamMembers.ts', 'utf8')

  it('Minha Conta usa o novo subtítulo', () => {
    expect(minhaConta).toContain('Gerencie sua conta, equipe, permissões, assinatura e dados de cobrança.')
    expect(minhaConta).not.toContain('Gerencie sua assinatura, pagamentos e dados de cobrança')
  })

  it('esconde Auditoria sem audit.view e mantém Comunidade para team.manage', () => {
    expect(center).toContain("can('audit.view')")
    expect(center).toContain("const canViewAudit = scope.isPlatformAdmin || isMaster || can('audit.view')")
    expect(center).toContain('{canViewAudit && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}')
    expect(center).toContain('{canViewAudit && (')
    expect(center).toContain('<TabsTrigger value="comunidade">Comunidade</TabsTrigger>')
    // colunas do TabsList calculadas dinamicamente
    expect(center).toContain('const tabCount = 3 + (canSeeCommunity ? 1 : 0) + (canViewAudit ? 1 : 0)')
    expect(center).toContain('TAB_COLS[tabCount]')
  })

  it('restringe Comunidade a platform admin ou master', () => {
    expect(center).toContain('const canSeeCommunity = scope.isPlatformAdmin || isMaster')
    expect(center).toContain('{canSeeCommunity && <TabsTrigger value="comunidade">Comunidade</TabsTrigger>}')
    expect(center).toContain('{canSeeCommunity && (')
  })

  it('tem ações de Bloquear, Desativar e Reativar com confirmação', () => {
    for (const t of ['Bloquear', 'Desativar', 'Reativar']) expect(center).toContain(t)
    expect(center).toContain('setConfirmStatus({ member: m, status: \'blocked\' })')
    expect(center).toContain('setConfirmStatus({ member: m, status: \'disabled\' })')
    expect(center).toContain('setConfirmStatus({ member: m, status: \'active\' })')
    expect(center).toContain('open={!!confirmStatus}')
    expect(center).toContain('open={!!confirmDelete}')
  })

  it('confirma revogação de convite', () => {
    expect(invites).toContain('open={!!confirmRevoke}')
    expect(invites).toContain('AlertDialogAction')
  })

  it('exibe alerta administrativo com responsável, plano e UUID', () => {
    expect(adminMgr).toContain('Você está administrando a equipe da agência {selected.agency_name} como administrador da plataforma.')
    expect(adminMgr).toContain('Responsável:')
    expect(adminMgr).toContain('Plano: {selected.plan}')
    expect(adminMgr).toContain('{selected.agency_id}')
    expect(adminMgr).toContain('plan: selected.plan,')
    // alerta persistente também dentro da central de equipe, com dados completos
    expect(center).toContain('Você está administrando a equipe da agência {scope.agencyName || \'selecionada\'} como administrador da plataforma.')
    expect(center).toContain('Proprietário: {scope.ownerName')
    expect(center).toContain('E-mail: {scope.ownerEmail')
    expect(center).toContain('Plano: {scope.plan')
    expect(center).toContain('Agência (UUID):')
  })

  it('confirma limite administrativo informando agência, valores e efeito', () => {
    expect(adminMgr).toContain('Agência ${agencyName}')
    expect(adminMgr).toContain('NÃO desativa nenhum usuário')
    expect(adminMgr).toContain('O limite passa de ${effective} para ${value} acessos')
    expect(adminMgr).toContain('LimitOverrideCard agencyId={selected.agency_id} agencyName={selected.agency_name}')
    expect(adminMgr).toContain('limite do plano ')
  })

  it('auditoria envia filtros para a Edge Function (admin) e para a RPC (agência)', () => {
    expect(hook).toContain('action_filter: f.action ?? null, module_filter: f.moduleKey ?? null')
    expect(hook).toContain('from: f.from ?? null, to: f.to ?? null')
    expect(hook).toContain('_action: f.action ?? null')
    expect(hook).toContain('_module_key: f.moduleKey ?? null')
    expect(hook).toContain('_from: f.from ?? null')
    expect(hook).toContain('_to: f.to ?? null')
    // sem refiltragem no navegador
    expect(hook).not.toContain('rows.filter(r => r.action === f.action)')
    expect(auditView).toContain('useTeamMembers()')
    expect(auditView).toContain('type="date"')
  })
})


describe('migration da auditoria de equipe', () => {
  const sql = readdirSync('supabase/migrations')
    .filter(f => f.endsWith('.sql')).sort()
    .map(f => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    .filter(t => t.includes('FUNCTION public.team_audit_log'))
    .pop()!

  it('aceita filtros de colaborador, ação, módulo e período no banco', () => {
    for (const arg of ['_member_id uuid', '_action text', '_module_key text',
      '_from timestamp with time zone', '_to timestamp with time zone']) {
      expect(sql).toContain(arg)
    }
    expect(sql).toContain('(_action IS NULL OR a.action = _action)')
    expect(sql).toContain('(_module_key IS NULL OR a.module_key = _module_key)')
    expect(sql).toContain('(_from IS NULL OR a.created_at >= _from)')
    expect(sql).toContain('(_to IS NULL OR a.created_at <= _to)')
  })

  it('exige audit.view (via can_team, que valida status ativo) e isola a agência', () => {
    expect(sql).toContain("public.can_team('audit.view')")
    expect(sql).toContain('a.agency_id = public.user_agency_id(auth.uid())')
  })

  it('remove a assinatura antiga sem filtros e restringe o EXECUTE', () => {
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.team_audit_log(integer, uuid);')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.team_audit_log(integer, uuid, text, text, timestamp with time zone, timestamp with time zone) FROM PUBLIC;')
    expect(sql).toContain('TO authenticated, service_role;')
    expect(sql).not.toContain('TO anon')
  })
})

describe('patch final — revoke anon e KPI de agências', () => {
  const sqls = readdirSync('supabase/migrations')
    .filter(f => f.endsWith('.sql')).sort()
    .map(f => readFileSync(`supabase/migrations/${f}`, 'utf8'))

  it('remove EXECUTE de anon/PUBLIC em team_can_read_team', () => {
    const sql = sqls.filter(t => t.includes('REVOKE EXECUTE ON FUNCTION public.team_can_read_team(uuid) FROM anon')).pop()
    expect(sql).toBeTruthy()
    expect(sql!).toContain('REVOKE EXECUTE ON FUNCTION public.team_can_read_team(uuid) FROM PUBLIC;')
    expect(sql!).toContain('GRANT EXECUTE ON FUNCTION public.team_can_read_team(uuid) TO authenticated, service_role;')
  })

  it('cria contagem de proprietários/agências restrita ao service_role', () => {
    const sql = sqls.filter(t => t.includes('FUNCTION public.admin_agency_owners_total()')).pop()
    expect(sql).toBeTruthy()
    expect(sql!).toContain('FROM public.profiles p')
    expect(sql!).toContain('WHERE p.user_id IS NOT NULL')
    expect(sql!).toContain('WHERE m.auth_user_id = p.user_id')
    expect(sql!).toContain("SET search_path TO 'public'")
    expect(sql!).toContain('GRANT EXECUTE ON FUNCTION public.admin_agency_owners_total() TO service_role;')
    expect(sql!).not.toContain('TO anon')
  })

  it('stats usa a RPC de proprietários em vez do count bruto de profiles', () => {
    const fn = readFileSync('supabase/functions/admin-agency-teams/index.ts', 'utf8')
    const stats = fn.slice(fn.indexOf("if (action === 'stats')"), fn.indexOf("if (action === 'agencies')"))
    expect(stats).toContain("admin.rpc('admin_agency_owners_total')")
    expect(stats).toContain('agencies_total: Number(ownersTotal.data ?? 0)')
    expect(stats).not.toContain("admin.from('profiles').select('user_id', { count: 'exact', head: true })")
  })
})
