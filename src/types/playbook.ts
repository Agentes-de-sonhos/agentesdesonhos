export interface PlaybookDestination {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookSection {
  id: string;
  destination_id: string;
  tab_key: string;
  title: string;
  content: PlaybookContent;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookContent {
  intro?: string;
  blocks?: PlaybookBlock[];
  pdf_url?: string;
  pdf_files?: PlaybookPDFFile[];
}

export interface PlaybookPDFFile {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pdf_url: string;
}

export interface PlaybookBlock {
  id: string;
  type: 'text' | 'tip' | 'alert' | 'strategy' | 'checklist' | 'highlight';
  title?: string;
  content: string;
  items?: string[];
}

export const PLAYBOOK_TABS = [
  { key: 'visao_geral', label: 'Visão Geral', icon: 'LayoutDashboard' },
  { key: 'mapas_mentais', label: 'Mapas Mentais', icon: 'GitBranch' },
  { key: 'como_vender', label: 'Como Vender', icon: 'TrendingUp' },
  { key: 'perfis_clientes', label: 'Perfis de Clientes', icon: 'Users' },
  { key: 'pacote_ideal', label: 'Pacote Ideal', icon: 'Package' },
  { key: 'documentacao', label: 'Documentação', icon: 'FileText' },
  { key: 'logistica_aerea', label: 'Logística Aérea', icon: 'Plane' },
  { key: 'hospedagem', label: 'Hospedagem', icon: 'Hotel' },
  { key: 'atracoes', label: 'Atrações', icon: 'Camera' },
  { key: 'gastronomia', label: 'Gastronomia', icon: 'UtensilsCrossed' },
  { key: 'viagens_combinadas', label: 'Viagens Combinadas', icon: 'Route' },
  { key: 'segredos_destino', label: 'Segredos do Destino', icon: 'Lightbulb' },
  { key: 'alertas_golpes', label: 'Alertas e Golpes', icon: 'AlertTriangle' },
  { key: 'checklist_final', label: 'Checklist Final', icon: 'CheckSquare' },
] as const;

export type PlaybookTabKey = typeof PLAYBOOK_TABS[number]['key'];
