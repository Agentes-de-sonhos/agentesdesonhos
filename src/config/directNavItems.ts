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
  /** Cores temáticas herdadas das antigas seções expansíveis */
  theme: {
    /** Estado ativo (fundo temático forte) */
    headerBg: string;
    /** Hover quando ativo */
    headerHoverBg: string;
    /** Hover no estado normal */
    hoverColor: string;
  };
}

export const CLIENTES_DIRECT_ITEM: DirectNavItemConfig = {
  key: "section_clientes",
  title: "GESTÃO DE CLIENTES",
  url: "/gestao-clientes/funil",
  activePrefix: "/gestao-clientes",
  requiredFeature: "crm_basic",
  anyPermission: [
    "dashboard.view",
    "clients.view",
    "opportunities.view",
    "operations.view",
    "goals.view",
  ],
  theme: {
    headerBg: "bg-cyan-600 text-white",
    headerHoverBg: "hover:bg-cyan-700",
    hoverColor: "hover:bg-cyan-600 hover:text-white",
  },
};

/**
 * Central de Reservas: a ficha de cada venda. Fica logo depois da Gestão de
 * Clientes e antes da Gestão Financeira. Depende apenas das permissões de
 * reservas — não exige o site white label nem o recurso de solicitação pública.
 */
export const RESERVAS_DIRECT_ITEM: DirectNavItemConfig = {
  key: "section_reservas",
  title: "CENTRAL DE RESERVAS",
  url: "/reservas",
  activePrefix: "/reservas",
  requiredFeature: "crm_basic",
  anyPermission: ["reservations.view"],
  theme: {
    headerBg: "bg-indigo-600 text-white",
    headerHoverBg: "hover:bg-indigo-700",
    hoverColor: "hover:bg-indigo-600 hover:text-white",
  },
};

export const FINANCEIRO_DIRECT_ITEM: DirectNavItemConfig = {
  key: "section_financeiro",
  title: "GESTÃO FINANCEIRA",
  url: "/financeiro?tab=dashboard",
  activePrefix: "/financeiro",
  requiredFeature: "financial",
  anyPermission: ["financial.access"],
  theme: {
    headerBg: "bg-emerald-600 text-white",
    headerHoverBg: "hover:bg-emerald-700",
    hoverColor: "hover:bg-emerald-600 hover:text-white",
  },
};

export const DIRECT_NAV_ITEMS = [
  CLIENTES_DIRECT_ITEM,
  RESERVAS_DIRECT_ITEM,
  FINANCEIRO_DIRECT_ITEM,
];
