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
}

export interface PlaybookBlock {
  id: string;
  type: 'text' | 'tip' | 'alert' | 'strategy' | 'checklist' | 'highlight';
  title?: string;
  content: string;
  items?: string[];
}

export const PLAYBOOK_TABS = [
  { key: 'visao_estrategica', label: 'Visão Estratégica', icon: 'Target' },
  { key: 'como_vender', label: 'Como Vender', icon: 'TrendingUp' },
  { key: 'documentacao', label: 'Documentação', icon: 'FileText' },
  { key: 'logistica_aerea', label: 'Logística Aérea', icon: 'Plane' },
  { key: 'chegada_transfer', label: 'Chegada & Transfer', icon: 'MapPin' },
  { key: 'hospedagem', label: 'Hospedagem', icon: 'Hotel' },
  { key: 'transporte', label: 'Transporte', icon: 'Car' },
  { key: 'atracoes', label: 'Atrações', icon: 'Camera' },
  { key: 'gastronomia', label: 'Gastronomia', icon: 'UtensilsCrossed' },
  { key: 'pacote_ideal', label: 'Pacote Ideal', icon: 'Package' },
  { key: 'seguro_viagem', label: 'Seguro Viagem', icon: 'Shield' },
  { key: 'perfis_clientes', label: 'Perfis de Clientes', icon: 'Users' },
  { key: 'viagens_combinadas', label: 'Viagens Combinadas', icon: 'Route' },
  { key: 'alertas_golpes', label: 'Alertas & Golpes', icon: 'AlertTriangle' },
  { key: 'dicas_insider', label: 'Dicas Insider', icon: 'Lightbulb' },
  { key: 'checklist_final', label: 'Checklist Final', icon: 'CheckSquare' },
] as const;

export type PlaybookTabKey = typeof PLAYBOOK_TABS[number]['key'];
