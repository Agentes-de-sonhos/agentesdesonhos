/**
 * Fonte ÚNICA do menu do painel administrativo White Label.
 *
 * O menu lateral real (`AgencyAdminSidebar`) e o laboratório (`Site Lab`)
 * consomem exatamente estas listas, na mesma ordem, com os mesmos rótulos,
 * ícones e permissões. Assim, qualquer melhoria futura no núcleo compartilhado
 * aparece automaticamente nos dois lugares — a única variação permitida é
 * identidade (nome, logotipo e paleta).
 */
import {
  FileText,
  FolderOpen,
  Headphones,
  KanbanSquare,
  Layers,
  Map,
  Ticket,
  UserCog,
  UserRound,
  UsersRound,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface MenuItemDef {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Caminhos (além de `to`) que marcam o item como ativo. */
  match?: (pathname: string, search: string) => boolean;
  /** Permissão exigida; ausente = sempre visível. */
  permission?: string;
}

function tabMatcher(tab: string) {
  return (pathname: string, search: string) =>
    (pathname === "/gestao/meus-projetos" || pathname === "/meus-projetos") &&
    new URLSearchParams(search).get("tab") === tab;
}

export const PROJECTS_ITEMS: MenuItemDef[] = [
  {
    label: "Orçamentos",
    to: "/gestao/meus-projetos?tab=orcamentos",
    icon: FileText,
    match: (p, s) =>
      (p === "/gestao/meus-projetos" || p === "/meus-projetos") &&
      (new URLSearchParams(s).get("tab") ?? "orcamentos") === "orcamentos",
  },
  { label: "Roteiros", to: "/gestao/meus-projetos?tab=roteiros", icon: Map, match: tabMatcher("roteiros") },
  {
    label: "Carteiras digitais",
    to: "/gestao/meus-projetos?tab=carteiras",
    icon: WalletCards,
    match: tabMatcher("carteiras"),
  },
  { label: "Modelos", to: "/gestao/meus-projetos?tab=modelos", icon: Layers, match: tabMatcher("modelos") },
];

export const CREATE_ITEMS: MenuItemDef[] = [
  { label: "Novo orçamento", to: "/gestao/criar/orcamento", icon: FileText },
  { label: "Novo roteiro", to: "/gestao/criar/roteiro", icon: Map },
  { label: "Nova carteira digital", to: "/gestao/criar/carteira", icon: WalletCards },
  { label: "Nova oportunidade", to: "/gestao/crm/funil", icon: KanbanSquare, permission: "opportunities.view" },
  { label: "Nova operação", to: "/gestao/crm/operacoes", icon: FolderOpen, permission: "operations.view" },
];

export const MANAGEMENT_ITEMS: MenuItemDef[] = [
  {
    label: "Oportunidades",
    to: "/gestao/crm/funil",
    icon: KanbanSquare,
    match: (p) => p.includes("/funil"),
    permission: "opportunities.view",
  },
  {
    label: "Operações",
    to: "/gestao/crm/operacoes",
    icon: FolderOpen,
    match: (p) => p.includes("/operacoes"),
    permission: "operations.view",
  },
  {
    label: "Clientes",
    to: "/gestao/crm/clientes",
    icon: UsersRound,
    match: (p) => p.includes("/clientes"),
    permission: "clients.view",
  },
  {
    label: "Reservas",
    to: "/gestao/reservas",
    icon: Ticket,
    match: (p) => p.startsWith("/gestao/reservas"),
  },
  {
    label: "Financeiro",
    to: "/gestao/financeiro",
    icon: Wallet,
    match: (p) => p === "/gestao/financeiro" || p === "/financeiro",
    permission: "financial.access",
  },
];

export const USER_ITEMS: MenuItemDef[] = [
  { label: "Meu perfil", to: "/gestao/perfil", icon: UserRound },
  { label: "Minha conta", to: "/gestao/minha-conta", icon: UserCog },
  { label: "Suporte", to: "/gestao/suporte", icon: Headphones },
];

/** Aplica as permissões do contexto atual preservando a ordem declarada. */
export function filterMenuByPermission(
  items: MenuItemDef[],
  can: (permission: string) => boolean,
): MenuItemDef[] {
  return items.filter((item) => !item.permission || can(item.permission));
}
