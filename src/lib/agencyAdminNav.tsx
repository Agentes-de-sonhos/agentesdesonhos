/**
 * Navegação contextual do Painel Administrativo White Label.
 *
 * As páginas da plataforma são reutilizadas dentro do painel da agência
 * (`/gestao/*`). Em vez de espalhar verificações de hostname ou strings
 * duplicadas pelos componentes, todas as rotas internas passam por aqui:
 * dentro do painel devolvem caminhos `/gestao/...`; na plataforma tradicional
 * devolvem exatamente os caminhos atuais (nada muda).
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const AgencyAdminNavContext = createContext(false);

/** Ativado apenas pelo AgencyAdminArea (domínio da agência, área /gestao). */
export function AgencyAdminNavProvider({ children }: { children: ReactNode }) {
  return <AgencyAdminNavContext.Provider value={true}>{children}</AgencyAdminNavContext.Provider>;
}

/** True quando o componente está renderizando dentro do painel white label. */
export function useIsAgencyAdminContext(): boolean {
  return useContext(AgencyAdminNavContext);
}

export type ProjectsTab = "orcamentos" | "roteiros" | "carteiras" | "modelos";
export type CrmTab = "funil" | "operacoes" | "clientes" | "dashboard" | "metas";

export interface AdminNavPaths {
  /** True dentro do painel white label da agência. */
  isAgencyAdmin: boolean;
  home: string;
  agenda: string;
  financeiro: string;
  perfil: string;
  minhaConta: string;
  suporte: string;
  projects: (tab?: ProjectsTab) => string;
  quote: (id?: string) => string;
  wallet: (id?: string) => string;
  itinerary: (id?: string) => string;
  itineraryTemplates: string;
  crm: (tab?: CrmTab) => string;
  reservas: (id?: string) => string;
}

function build(wl: boolean): AdminNavPaths {
  const withId = (base: string, id?: string) => (id ? `${base}/${id}` : base);
  return {
    isAgencyAdmin: wl,
    home: wl ? "/gestao" : "/dashboard",
    agenda: wl ? "/gestao/agenda" : "/agenda",
    financeiro: wl ? "/gestao/financeiro" : "/financeiro",
    perfil: wl ? "/gestao/perfil" : "/perfil",
    minhaConta: wl ? "/gestao/minha-conta" : "/minha-conta",
    suporte: wl ? "/gestao/suporte" : "/suporte",
    projects: (tab) => {
      const base = wl ? "/gestao/meus-projetos" : "/meus-projetos";
      return tab ? `${base}?tab=${tab}` : base;
    },
    quote: (id) => withId(wl ? "/gestao/criar/orcamento" : "/ferramentas-ia/gerar-orcamento", id),
    wallet: (id) => withId(wl ? "/gestao/criar/carteira" : "/ferramentas-ia/trip-wallet", id),
    itinerary: (id) => withId(wl ? "/gestao/criar/roteiro" : "/ferramentas-ia/criar-roteiro", id),
    itineraryTemplates: wl ? "/gestao/criar/modelos-roteiros" : "/ferramentas-ia/modelos-roteiros",
    crm: (tab = "funil") => (wl ? `/gestao/crm/${tab}` : `/gestao-clientes/${tab}`),
    reservas: (id) => withId(wl ? "/gestao/reservas" : "/reservas", id),
  };
}

const PLATFORM_PATHS = build(false);
const AGENCY_PATHS = build(true);

/** Caminhos administrativos corretos para o contexto atual. */
export function useAdminNav(): AdminNavPaths {
  const wl = useIsAgencyAdminContext();
  return wl ? AGENCY_PATHS : PLATFORM_PATHS;
}

/** Açúcar sintático: navegação + caminhos no mesmo hook. */
export function useAdminNavigate() {
  const nav = useAdminNav();
  const navigate = useNavigate();
  return useMemo(() => ({ ...nav, navigate }), [nav, navigate]);
}

/**
 * Abas de Meus Projetos disponíveis por contexto. No painel white label a
 * página mostra somente Orçamentos, Roteiros, Carteiras e Modelos.
 */
export const AGENCY_ADMIN_PROJECT_TABS: ProjectsTab[] = [
  "orcamentos",
  "roteiros",
  "carteiras",
  "modelos",
];
