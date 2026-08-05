// Catálogo central de permissões disponíveis para colaboradores da agência.
// As chaves são idênticas às usadas em agency_team_permissions e nos perfis
// nativos (public.agency_access_profiles).

export type ModuleKey =
  | 'dashboard' | 'clients' | 'opportunities' | 'operations' | 'sales'
  | 'quotes' | 'itineraries' | 'wallet' | 'agenda' | 'tasks'
  | 'financial' | 'marketing' | 'education' | 'community' | 'tools'
  | 'settings'

export type PipelineType = 'opportunities' | 'operations'

/** Escopos de dados suportados (public.team_data_scope). */
export type DataScope = 'own' | 'created' | 'assigned' | 'team' | 'department' | 'agency'

export const DATA_SCOPES: { value: DataScope; label: string; description: string }[] = [
  { value: 'own', label: 'Somente os próprios', description: 'Apenas registros que o colaborador criou ou que estão sob sua responsabilidade.' },
  { value: 'created', label: 'Criados por ele', description: 'Apenas registros criados pelo colaborador.' },
  { value: 'assigned', label: 'Atribuídos a ele', description: 'Apenas registros nos quais ele é o responsável.' },
  { value: 'team', label: 'Da equipe', description: 'Registros dos colaboradores da mesma equipe.' },
  { value: 'department', label: 'Do departamento', description: 'Registros de todos os colaboradores do mesmo departamento.' },
  { value: 'agency', label: 'De toda a agência', description: 'Todos os registros da agência.' },
]

/** Módulos que aceitam escopo de dados (public.agency_team_scopes.module_key). */
export const SCOPED_MODULES: { key: string; label: string }[] = [
  { key: 'clients', label: 'Clientes' },
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'operations', label: 'Operações' },
  { key: 'quotes', label: 'Orçamentos' },
  { key: 'itineraries', label: 'Roteiros' },
  { key: 'wallet', label: 'Carteira Digital' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'tasks', label: 'Tarefas' },
  { key: 'financial', label: 'Financeiro' },
]

export interface PermissionDef {
  key: string
  label: string
  module: ModuleKey
  /** Permissão sensível: destacada na interface. */
  sensitive?: boolean
}

export interface PermissionGroup {
  module: ModuleKey
  label: string
  description?: string
  permissions: PermissionDef[]
}

const g = (module: ModuleKey, label: string, description: string, items: [string, string, boolean?][]): PermissionGroup => ({
  module,
  label,
  description,
  permissions: items.map(([key, l, sensitive]) => ({ key, label: l, module, sensitive })),
})

export const PERMISSION_GROUPS: PermissionGroup[] = [
  g('dashboard', 'Página inicial', 'Acesso ao painel inicial da plataforma.', [
    ['dashboard.view', 'Visualizar a página inicial'],
  ]),
  g('clients', 'Clientes', 'Cadastro e gestão da base de clientes.', [
    ['clients.view', 'Visualizar clientes'],
    ['clients.create', 'Cadastrar clientes'],
    ['clients.edit', 'Editar clientes'],
    ['clients.delete', 'Excluir clientes', true],
    ['clients.export', 'Exportar lista de clientes', true],
    ['clients.assign', 'Definir responsável pelo cliente'],
  ]),
  g('opportunities', 'Oportunidades', 'Funil comercial de vendas.', [
    ['opportunities.view', 'Visualizar oportunidades'],
    ['opportunities.create', 'Criar oportunidades'],
    ['opportunities.edit', 'Editar oportunidades'],
    ['opportunities.delete', 'Excluir oportunidades', true],
    ['opportunities.assign', 'Definir responsável'],
    ['opportunities.generate_quote', 'Gerar orçamento a partir da oportunidade'],
    ['opportunities.generate_wallet', 'Gerar carteira digital'],
  ]),
  g('operations', 'Operações', 'Pós-venda e acompanhamento das viagens.', [
    ['operations.view', 'Visualizar operações'],
    ['operations.create', 'Criar operações'],
    ['operations.edit', 'Editar operações'],
    ['operations.delete', 'Excluir operações', true],
    ['operations.assign', 'Definir responsável'],
  ]),
  g('sales', 'Vendas', 'Registro de vendas fechadas.', [
    ['sales.view', 'Visualizar vendas'],
    ['sales.create', 'Registrar vendas'],
    ['sales.edit', 'Editar vendas'],
    ['sales.delete', 'Excluir vendas', true],
    ['sales.export', 'Exportar vendas', true],
  ]),
  g('quotes', 'Orçamentos', 'Criação e compartilhamento de orçamentos.', [
    ['quotes.view', 'Visualizar orçamentos'],
    ['quotes.create', 'Criar orçamentos'],
    ['quotes.edit', 'Editar orçamentos'],
    ['quotes.delete', 'Excluir orçamentos', true],
    ['quotes.duplicate', 'Duplicar orçamentos'],
    ['quotes.share', 'Compartilhar link público'],
  ]),
  g('itineraries', 'Roteiros', 'Roteiros de viagem e modelos.', [
    ['itineraries.view', 'Visualizar roteiros'],
    ['itineraries.create', 'Criar roteiros'],
    ['itineraries.edit', 'Editar roteiros'],
    ['itineraries.delete', 'Excluir roteiros', true],
    ['itineraries.duplicate', 'Duplicar roteiros'],
    ['itineraries.share', 'Compartilhar link público'],
  ]),
  g('wallet', 'Carteira Digital', 'Documentos e vouchers de viagem.', [
    ['wallet.view', 'Visualizar carteiras'],
    ['wallet.create', 'Criar carteiras'],
    ['wallet.edit', 'Editar carteiras'],
    ['wallet.delete', 'Excluir carteiras', true],
    ['wallet.share', 'Compartilhar link público'],
  ]),
  g('agenda', 'Agenda e tarefas', 'Compromissos, lembretes e tarefas.', [
    ['agenda.view', 'Visualizar agenda'],
    ['agenda.create', 'Criar compromissos'],
    ['agenda.edit', 'Editar compromissos'],
    ['agenda.delete', 'Excluir compromissos'],
    ['tasks.view', 'Visualizar tarefas'],
    ['tasks.create', 'Criar tarefas'],
    ['tasks.edit', 'Editar tarefas'],
    ['tasks.delete', 'Excluir tarefas'],
    ['tasks.assign', 'Atribuir tarefas a outros'],
    ['trips.view', 'Visualizar próximas viagens'],
  ]),
  g('financial', 'Gestão Financeira', 'Faturamento, despesas, comissões e relatórios.', [
    ['financial.access', 'Acessar o módulo financeiro'],
    ['financial.view_revenue', 'Ver faturamento', true],
    ['financial.view_margin', 'Ver margem e lucro', true],
    ['financial.income.view', 'Ver entradas'],
    ['financial.income.manage', 'Lançar e editar entradas'],
    ['financial.expenses.view', 'Ver despesas'],
    ['financial.expenses.manage', 'Lançar e editar despesas'],
    ['financial.invoices.view', 'Ver faturas'],
    ['financial.invoices.manage', 'Emitir e editar faturas'],
    ['financial.commissions.view', 'Ver comissões'],
    ['financial.commissions.manage', 'Gerenciar comissões', true],
    ['financial.sellers.manage', 'Gerenciar vendedores e regras', true],
    ['financial.reports.view', 'Ver relatórios financeiros'],
    ['financial.export', 'Exportar dados financeiros', true],
    ['financial.settings', 'Configurações financeiras', true],
  ]),
  g('marketing', 'Ferramentas de Marketing', 'Páginas, formulários, cartão e vitrine.', [
    ['marketing.sales_pages.view', 'Ver páginas de vendas'],
    ['marketing.sales_pages.manage', 'Criar e editar páginas de vendas'],
    ['marketing.lead_form.view', 'Ver formulário conversacional'],
    ['marketing.lead_form.manage', 'Configurar formulário conversacional'],
    ['marketing.business_card.view', 'Ver cartão digital'],
    ['marketing.business_card.manage', 'Editar cartão digital'],
    ['marketing.showcase.view', 'Ver vitrine'],
    ['marketing.showcase.manage', 'Gerenciar vitrine'],
    ['marketing.captions.view', 'Legendas e conteúdos'],
    ['marketing.slides.view', 'Apresentações'],
    ['marketing.materials.view', 'Materiais de divulgação'],
    ['marketing.air_blocks.view', 'Bloqueios aéreos'],
  ]),
  g('education', 'Educação', 'Academy, cursos e mentorias.', [
    ['academy.view', 'EducaTravel Academy'],
    ['courses.view', 'Cursos'],
    ['mentorships.view', 'Mentorias'],
  ]),
  g('community', 'Comunidade e chat', 'Participação social e conversas.', [
    ['community.public.view', 'Comunidade pública (entre agências)'],
    ['community.internal.view', 'Comunidade interna da agência'],
    ['community.post', 'Publicar e comentar'],
    ['community.qa.view', 'Perguntas e respostas'],
    ['community.news.view', 'Radar do Turismo / notícias'],
    ['chat.internal', 'Conversar com colegas da agência'],
    ['chat.external', 'Conversar com agentes de outras agências'],
    ['online_users.view', 'Ver usuários online'],
  ]),
  g('tools', 'Ferramentas e consultas', 'Recursos de apoio ao dia a dia.', [
    ['directory.view', 'Mapa do Turismo / fornecedores'],
    ['advisor.view', 'Consultores de destino'],
    ['hotel_xray.view', 'Hotel Raio-X'],
    ['travel_requirements.view', 'Requisitos de viagem'],
    ['benefits.view', 'Benefícios e descontos'],
    ['ai.use', 'Usar recursos de inteligência artificial'],
    ['notes.view', 'Bloco de notas'],
    ['calculator.view', 'Calculadora'],
    ['gamification.view', 'Ranking e gamificação'],
    ['support.view', 'Abrir chamados de suporte'],
  ]),
  g('settings', 'Conta e administração', 'Configurações da agência.', [
    ['settings.view', 'Ver configurações'],
    ['settings.edit', 'Editar configurações', true],
    ['account.view', 'Ver dados da conta'],
    ['subscription.view', 'Ver assinatura e plano', true],
    ['integrations.manage', 'Gerenciar integrações', true],
    ['team.manage', 'Gerenciar equipe e permissões', true],
    ['audit.view', 'Ver histórico de auditoria', true],
  ]),
]

export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_GROUPS.flatMap(gr => gr.permissions)
export const ALL_PERMISSION_KEYS: string[] = ALL_PERMISSIONS.map(p => p.key)

export function permissionLabel(key: string): string {
  return ALL_PERMISSIONS.find(p => p.key === key)?.label ?? key
}

/** Permissões que o proprietário nunca pode delegar por engano sem revisão. */
export const SENSITIVE_KEYS = ALL_PERMISSIONS.filter(p => p.sensitive).map(p => p.key)

// ─────────────────────────────────────────────────────────────
// Compatibilidade com a implementação anterior
// ─────────────────────────────────────────────────────────────

export const CLIENTS_PERMISSIONS: PermissionDef[] = ALL_PERMISSIONS.filter(p =>
  ['dashboard', 'clients', 'opportunities', 'operations'].includes(p.module) ||
  p.key === 'goals.view' || p.key === 'goals.edit'
)

export const FINANCIAL_PERMISSIONS: PermissionDef[] = ALL_PERMISSIONS.filter(p => p.module === 'financial')

export function totalClientsAccess() {
  return CLIENTS_PERMISSIONS.map(p => ({ module_key: 'clients', permission_key: p.key, enabled: true as const }))
}

export function totalFinancialAccess() {
  return FINANCIAL_PERMISSIONS.map(p => ({ module_key: 'financial', permission_key: p.key, enabled: true as const }))
}

/** Converte um conjunto de chaves em linhas para agency_team_permissions. */
export function keysToPermissionRows(keys: Iterable<string>) {
  const byKey = new Map(ALL_PERMISSIONS.map(p => [p.key, p]))
  const rows: { module_key: string; permission_key: string; enabled: true }[] = []
  for (const k of keys) {
    const def = byKey.get(k)
    if (!def) continue
    rows.push({ module_key: def.module, permission_key: k, enabled: true })
  }
  return rows
}
