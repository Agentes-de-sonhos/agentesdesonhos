// Shared menu structure configuration for admin panel and sidebar ordering

export interface MenuItemConfig {
  key: string;
  label: string;
  isSection?: boolean;
  sectionKey?: string; // for sections, maps to menu_order.section
}

export const MAIN_MENU_ITEMS: MenuItemConfig[] = [
  { key: "inicio", label: "Início" },
  { key: "section_conhecimento", label: "Conhecimento", isSection: true, sectionKey: "conhecimento" },
  { key: "section_guias", label: "Guias e Referências", isSection: true, sectionKey: "guias" },
  { key: "section_recursos_vendas", label: "Recursos de Vendas", isSection: true, sectionKey: "recursos_vendas" },
  { key: "section_criar", label: "Criar", isSection: true, sectionKey: "criar" },
  { key: "meus_projetos", label: "Meus Projetos" },
  { key: "section_clientes", label: "Clientes", isSection: true, sectionKey: "clientes" },
  { key: "section_financeiro", label: "Financeiro", isSection: true, sectionKey: "financeiro" },
  { key: "section_marketing", label: "Marketing", isSection: true, sectionKey: "marketing" },
  { key: "comunidade", label: "Comunidade" },
  { key: "cursos_mentorias", label: "Cursos e Mentorias" },
];

export const SECTION_ITEMS: Record<string, MenuItemConfig[]> = {
  conhecimento: [
    { key: "educa_academy", label: "EducaTravel Academy" },
    { key: "noticias", label: "Notícias do Trade" },
  ],
  guias: [
    { key: "mapa_turismo", label: "Mapa do Turismo" },
    { key: "travel_advisor", label: "Travel Advisor" },
    { key: "beneficios", label: "Benefícios e Descontos" },
    { key: "agenda", label: "Minha Agenda" },
  ],
  recursos_vendas: [
    { key: "bloqueios_aereos", label: "Bloqueios Aéreos" },
    { key: "materiais", label: "Materiais de Divulgação" },
    { key: "hotel_raio_x", label: "Raio-X do Hotel" },
  ],
  criar: [
    { key: "carteira_digital", label: "Carteira Digital" },
    { key: "orcamento", label: "Orçamento" },
    { key: "roteiros", label: "Roteiros" },
    { key: "conteudo", label: "Conteúdo" },
    { key: "bloco_notas", label: "Bloco de Notas" },
  ],
  clientes: [
    { key: "gestao_clientes", label: "Gestão de Clientes" },
    { key: "oportunidades", label: "Oportunidades" },
    { key: "meta_vendas", label: "Meta de Vendas" },
  ],
  financeiro: [
    { key: "dashboard_fin", label: "Dashboard" },
    { key: "entradas", label: "Entradas" },
    { key: "despesas", label: "Despesas" },
    { key: "vendas_fin", label: "Vendas" },
    { key: "comissoes", label: "Comissões" },
    { key: "vendedores", label: "Vendedores" },
  ],
  marketing: [
    { key: "cartao_visitas", label: "Cartão de Visitas" },
    { key: "vitrine_ofertas", label: "Vitrine de Ofertas" },
    { key: "personalizador_laminas", label: "Personalizador de Lâminas" },
    { key: "captacao_leads", label: "Captação de Leads" },
  ],
};
