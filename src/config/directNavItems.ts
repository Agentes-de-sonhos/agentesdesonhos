// Entradas do menu principal que deixaram de ser seções expansíveis
// e passaram a navegar direto para a respectiva "Visão Geral".
export interface DirectNavItemConfig {
  key: string;
  title: string;
  /** Rota da Visão Geral da área */
  url: string;
  /** Prefixo usado para marcar o item como ativo em qualquer página interna da área */
  activePrefix: string;
  requiredFeature: string;
  /** Basta uma destas permissões de equipe para exibir o item */
  anyPermission: string[];
}

export const CLIENTES_DIRECT_ITEM: DirectNavItemConfig = {
  key: "section_clientes",
  title: "Gestão de Clientes",
  url: "/gestao-clientes/dashboard",
  activePrefix: "/gestao-clientes",
  requiredFeature: "crm_basic",
  anyPermission: [
    "dashboard.view",
    "clients.view",
    "opportunities.view",
    "operations.view",
    "goals.view",
  ],
};

export const FINANCEIRO_DIRECT_ITEM: DirectNavItemConfig = {
  key: "section_financeiro",
  title: "Gestão Financeira",
  url: "/financeiro?tab=dashboard",
  activePrefix: "/financeiro",
  requiredFeature: "financial",
  anyPermission: ["financial.access"],
};

export const DIRECT_NAV_ITEMS = [CLIENTES_DIRECT_ITEM, FINANCEIRO_DIRECT_ITEM];
