// Mapeamento central rota -> permissão de equipe.
// Fonte única usada por: guard de rota, menu principal, menu mobile,
// busca global, atalhos e cards do dashboard.
//
// Regra: proprietário/master ignora todas as checagens (usePermissions.can()
// retorna true). Colaborador precisa da permissão listada.

export interface RoutePermission {
  /** Prefixo da rota (match por igualdade ou por `path.startsWith(prefix + '/')`). */
  prefix: string
  /** Permissão necessária (basta uma quando houver várias). */
  any: string[]
}

/** Rotas públicas/serviço que nunca são bloqueadas. */
export const PUBLIC_ROUTE_PREFIXES = [
  '/auth', '/onboarding', '/reset-password', '/convite', '/cadastro',
  '/orcamento', '/roteiro', '/viagem', '/fatura', '/c/', '/v/', '/lp/',
  '/formulario', '/pesquisa', '/playbook', '/ativar-cartao', '/captura-cartao',
  '/politicasdeprivacidade', '/termosdeuso', '/blog', '/planos',
  '/desconto30off', '/experiencias', '/cadastro-fornecedor', '/cadastro-guia',
  '/.lovable', '/certificate-test',
]

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Página inicial e projetos
  { prefix: '/dashboard', any: ['dashboard.view'] },
  { prefix: '/dashboard-start', any: ['dashboard.view'] },
  { prefix: '/proximas-viagens', any: ['trips.view', 'agenda.view'] },
  { prefix: '/meus-projetos', any: ['quotes.view', 'itineraries.view', 'wallet.view'] },

  // Gestão de clientes
  { prefix: '/gestao-clientes/dashboard', any: ['dashboard.view', 'clients.view'] },
  { prefix: '/gestao-clientes/clientes', any: ['clients.view'] },
  { prefix: '/gestao-clientes/funil', any: ['opportunities.view'] },
  { prefix: '/gestao-clientes/operacoes', any: ['operations.view'] },
  { prefix: '/gestao-clientes/metas', any: ['goals.view'] },
  { prefix: '/gestao-clientes', any: ['clients.view', 'opportunities.view', 'operations.view', 'goals.view'] },
  { prefix: '/crm', any: ['clients.view'] },

  // Financeiro
  { prefix: '/financeiro', any: ['financial.access'] },
  { prefix: '/assinaturas-comerciais', any: ['settings.view'] },

  // Criação
  { prefix: '/ferramentas-ia/gerar-orcamento', any: ['quotes.view'] },
  { prefix: '/ferramentas-ia/criar-roteiro', any: ['itineraries.view'] },
  { prefix: '/ferramentas-ia/modelos-roteiros', any: ['itineraries.view'] },
  { prefix: '/ferramentas-ia/trip-wallet', any: ['wallet.view'] },
  { prefix: '/ferramentas-ia/criar-conteudo', any: ['marketing.captions.view'] },
  { prefix: '/ferramentas-ia', any: ['quotes.view', 'itineraries.view', 'wallet.view'] },
  { prefix: '/bloco-notas', any: ['notes.view'] },
  { prefix: '/calculadora', any: ['calculator.view'] },

  // Agenda
  { prefix: '/agenda', any: ['agenda.view'] },
  { prefix: '/agenda-trade', any: ['agenda.view'] },

  // Marketing
  { prefix: '/meus-leads/landings', any: ['marketing.sales_pages.view'] },
  { prefix: '/meus-leads/conversacional', any: ['marketing.lead_form.view'] },
  { prefix: '/meus-leads', any: ['marketing.sales_pages.view', 'marketing.lead_form.view'] },
  { prefix: '/meu-cartao', any: ['marketing.business_card.view'] },
  { prefix: '/criar-cartao', any: ['marketing.business_card.manage'] },
  { prefix: '/minha-vitrine', any: ['marketing.showcase.view'] },
  { prefix: '/personalizador-laminas', any: ['marketing.slides.view'] },
  { prefix: '/materiais', any: ['marketing.materials.view'] },
  { prefix: '/meus-materiais', any: ['marketing.materials.view'] },
  { prefix: '/bloqueios-aereos', any: ['marketing.air_blocks.view'] },
  { prefix: '/sorteador', any: ['marketing.materials.view'] },

  // Educação
  { prefix: '/educa-academy', any: ['academy.view'] },
  { prefix: '/cursos', any: ['courses.view'] },
  { prefix: '/mentorias', any: ['mentorships.view'] },
  { prefix: '/noticias', any: ['community.news.view'] },

  // Comunidade e chat
  { prefix: '/comunidade/chat', any: ['chat.internal', 'chat.external'] },
  { prefix: '/comunidade', any: ['community.public.view', 'community.internal.view'] },
  { prefix: '/trade-connect', any: ['community.public.view'] },
  { prefix: '/perguntas-respostas', any: ['community.qa.view'] },
  { prefix: '/gamificacao', any: ['gamification.view'] },

  // Guias e consultas
  { prefix: '/mapa-turismo', any: ['directory.view'] },
  { prefix: '/dream-advisor', any: ['advisor.view'] },
  { prefix: '/hotel-raio-x', any: ['hotel_xray.view'] },
  { prefix: '/requisitos-viagem', any: ['travel_requirements.view'] },
  { prefix: '/beneficios', any: ['benefits.view'] },
  { prefix: '/suporte', any: ['support.view'] },
  { prefix: '/campanha-indicacao', any: ['account.view'] },
  { prefix: '/atualizacoes', any: ['dashboard.view'] },

  // Conta e configurações
  { prefix: '/minha-conta', any: ['account.view', 'settings.view', 'team.manage'] },
  { prefix: '/perfil', any: ['account.view'] },
  { prefix: '/meu-perfil-empresa', any: ['settings.view'] },
  { prefix: '/configuracoes/carteira', any: ['settings.edit'] },
]

function matches(prefix: string, path: string) {
  return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
}

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(p => path === p || path.startsWith(p))
}

/** Permissões aceitas para a rota (vazio = rota livre para autenticados). */
export function permissionsForRoute(path: string): string[] {
  if (isPublicRoute(path)) return []
  const hit = ROUTE_PERMISSIONS
    .filter(r => matches(r.prefix, path))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
  return hit?.any ?? []
}

/** Avalia a rota com o predicado de permissão vigente. */
export function canAccessRoute(path: string, can: (key: string) => boolean): boolean {
  const keys = permissionsForRoute(path)
  if (!keys.length) return true
  return keys.some(k => can(k))
}
