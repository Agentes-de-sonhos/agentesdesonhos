import { toTabTitleCase } from "@/lib/tabTitle";

/**
 * Canonical internal-route → tab title map. Longest prefix wins, so nested
 * routes (ex.: `/mapa-turismo/operadora/123`) inherit the module title.
 * Titles still pass through the central Title Case normalizer.
 */
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Inicial",
  "/dashboard-start": "Inicial",
  "/dashboard-fornecedor": "Inicial",
  "/admin": "Administração",
  "/agenda": "Minha Agenda",
  "/agenda-trade": "Agenda do Trade",
  "/proximas-viagens": "Próximas Viagens",
  "/comunidade": "Comunidade",
  "/educa-academy": "EducaTravel Academy",
  "/cursos": "Cursos e Mentorias",
  "/noticias": "Radar do Turismo",
  "/mapa-turismo": "Mapa do Turismo",
  "/beneficios": "Benefícios e Descontos",
  "/requisitos-viagem": "Central de Requisitos",
  "/hotel-raio-x": "Raio-X do Hotel",
  "/dream-advisor": "Travel Advisor",
  "/bloqueios-aereos": "Bloqueios Aéreos",
  "/materiais": "Materiais de Divulgação",
  "/meus-projetos": "Meus Projetos",
  "/meus-leads": "Formulário Conversacional",
  "/meus-leads/landings": "Páginas de Vendas",
  "/meu-cartao": "Cartão de Visitas",
  "/minha-vitrine": "Vitrine de Ofertas",
  "/personalizador-laminas": "Personalizador de Lâminas",
  "/bloco-notas": "Bloco de Notas",
  "/gestao-clientes": "Gestão de Clientes",
  "/financeiro": "Gestão Financeira",
  "/crm": "CRM",
  "/operacoes": "Operações",
  "/oportunidades": "Oportunidades",
  "/ferramentas-ia": "Ferramentas de IA",
  "/ferramentas-ia/trip-wallet": "Carteira Digital",
  "/ferramentas-ia/gerar-orcamento": "Orçamento",
  "/ferramentas-ia/criar-roteiro": "Roteiros",
  "/ferramentas-ia/criar-conteudo": "Legendas, Stories e WhatsApp",
  "/perfil": "Meu Perfil",
  "/minha-conta": "Minha Conta",
  "/suporte": "Suporte",
  "/gamificacao": "Gamificação",
  "/calculadora": "Calculadora",
  "/perguntas-respostas": "Perguntas e Respostas",
};

function humanize(pathname: string): string {
  const last = pathname.split("/").filter(Boolean).pop();
  if (!last) return "Nova Aba";
  return last.replace(/[-_]/g, " ");
}

/** Resolves the internal tab title for a pathname (query/hash excluded). */
export function titleForPath(pathname: string): string {
  const clean = (pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  let best = "";
  for (const route of Object.keys(ROUTE_TITLES)) {
    if ((clean === route || clean.startsWith(`${route}/`)) && route.length > best.length) {
      best = route;
    }
  }
  const raw = best ? ROUTE_TITLES[best] : humanize(clean);
  return toTabTitleCase(raw);
}