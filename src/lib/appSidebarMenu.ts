import {
  Building2,
  CalendarDays,
  Calculator,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  Map,
  Newspaper,
  Paintbrush,
  Plus,
  Route,
  ShoppingCart,
  Store,
  Tag,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/types/subscription";

export interface AppSidebarItem {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
  requiredFeature?: Feature;
  requiredPermission?: string;
  anyPermission?: string[];
  exactUrl?: boolean;
  activePrefix?: string;
}

export interface AppSidebarGroup {
  key: "create" | "projects" | "more";
  title: string;
  icon: LucideIcon;
  items: AppSidebarItem[];
  emphasis?: boolean;
}

export const APP_CREATE_GROUP: AppSidebarGroup = {
  key: "create",
  title: "Criar novo",
  icon: Plus,
  emphasis: true,
  items: [
    { key: "orcamento", title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator" },
    { key: "roteiros", title: "Roteiro", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "itinerary" },
    { key: "carteira_digital", title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, requiredFeature: "trip_wallet" },
    { key: "bloco_notas", title: "Bloco de Notas", url: "/bloco-notas", icon: FileText, requiredFeature: "notepad" },
  ],
};

export const APP_PROJECTS_GROUP: AppSidebarGroup = {
  key: "projects",
  title: "Meus projetos",
  icon: FolderOpen,
  items: [
    { key: "projetos_orcamentos", title: "Orçamentos", url: "/meus-projetos?tab=orcamentos", icon: FileText, requiredFeature: "quote_generator" },
    { key: "projetos_roteiros", title: "Roteiros", url: "/meus-projetos?tab=roteiros", icon: Route, requiredFeature: "itinerary" },
    { key: "projetos_carteiras", title: "Carteiras digitais", url: "/meus-projetos?tab=carteiras", icon: Wallet, requiredFeature: "trip_wallet" },
  ],
};

export const APP_AGENDA_ITEM: AppSidebarItem = {
  key: "agenda",
  title: "Agenda",
  url: "/agenda",
  icon: CalendarDays,
};

export const APP_MANAGEMENT_ITEMS: AppSidebarItem[] = [
  { key: "gestao_clientes", title: "Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic", requiredPermission: "clients.view" },
  { key: "oportunidades", title: "Oportunidades", url: "/gestao-clientes/funil", icon: ShoppingCart, requiredFeature: "crm_basic", requiredPermission: "opportunities.view" },
  { key: "operacoes", title: "Operações", url: "/gestao-clientes/operacoes", icon: FolderOpen, requiredFeature: "crm_basic", requiredPermission: "operations.view" },
  { key: "reservas", title: "Reservas", url: "/reservas", icon: ClipboardList, requiredFeature: "crm_basic", requiredPermission: "reservations.view" },
  { key: "financeiro", title: "Financeiro", url: "/financeiro?tab=dashboard", icon: Wallet, requiredFeature: "financial", requiredPermission: "financial.access", activePrefix: "/financeiro" },
];

export const APP_OTHER_ITEMS: AppSidebarItem[] = [
  { key: "noticias", title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
  { key: "educa_academy", title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
  { key: "mapa_turismo", title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
];

export const APP_MORE_GROUP: AppSidebarGroup = {
  key: "more",
  title: "Mais…",
  icon: FolderOpen,
  items: [
    { key: "hotel_raio_x", title: "Raio-X do Hotel", url: "/hotel-raio-x", icon: Building2, requiredFeature: "hotel_raio_x" },
    { key: "beneficios", title: "Benefícios e Descontos", url: "/beneficios", icon: Tag, requiredFeature: "benefits" },
    { key: "paginas_vendas", title: "Páginas de Vendas", url: "/meus-leads/landings", icon: FileText, requiredFeature: "lead_capture" },
    { key: "captacao_leads", title: "Formulário Conversacional", url: "/meus-leads", icon: UserPlus, requiredFeature: "lead_capture", exactUrl: true },
    { key: "cartao_visitas", title: "Cartão de Visitas", url: "/meu-cartao", icon: CreditCard, requiredFeature: "business_card" },
    { key: "vitrine_ofertas", title: "Vitrine de Ofertas", url: "/minha-vitrine", icon: Store, requiredFeature: "showcase" },
    { key: "conteudo", title: "Legendas, Stories e WhatsApp", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "content_creator" },
    { key: "personalizador_laminas", title: "Personalizador de Lâminas", url: "/personalizador-laminas", icon: Paintbrush, requiredFeature: "lamina_customizer" },
    { key: "requisitos_viagem", title: "Central de Requisitos", url: "/requisitos-viagem", icon: ClipboardList, requiredFeature: "travel_requirements" },
  ],
};

export const APP_SIDEBAR_SECTION_ORDER = ["MEU TRABALHO", "GESTÃO", "OUTRAS"] as const;
