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
  sections?: Record<string, { intro?: string }>;
}

export interface PlaybookPDFFile {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pdf_url: string;
  thumbnail_url?: string;
}

export type PlaybookBlockType =
  | 'text'
  | 'tip'
  | 'alert'
  | 'strategy'
  | 'checklist'
  | 'highlight'
  | 'rich_text'
  | 'image'
  | 'image_gallery'
  | 'video'
  | 'file_download'
  | 'separator'
  | 'custom_button'
  | 'table'
  | 'accordion';

export interface PlaybookBlock {
  id: string;
  type: PlaybookBlockType;
  title?: string;
  content: string;
  items?: string[];
  // Extended fields for new block types
  section?: string;
  image_url?: string;
  image_urls?: string[];
  video_url?: string;
  file_url?: string;
  file_name?: string;
  button_text?: string;
  button_url?: string;
  table_headers?: string[];
  table_rows?: string[][];
  accordion_items?: AccordionBlockItem[];
  alignment?: 'left' | 'center' | 'right';
}

export interface AccordionBlockItem {
  id: string;
  title: string;
  content: string;
}

export const PLAYBOOK_TABS = [
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
  { key: 'mapa', label: 'Mapa', icon: 'MapPin' },
  { key: 'checklist_final', label: 'Checklist Final', icon: 'CheckSquare' },
] as const;

export type PlaybookTabKey = typeof PLAYBOOK_TABS[number]['key'];

export const BLOCK_TYPE_OPTIONS: { type: PlaybookBlockType; label: string; icon: string }[] = [
  { type: 'rich_text', label: 'Texto Rico', icon: 'Type' },
  { type: 'text', label: 'Texto Simples', icon: 'AlignLeft' },
  { type: 'image', label: 'Imagem', icon: 'Image' },
  { type: 'image_gallery', label: 'Galeria', icon: 'LayoutGrid' },
  { type: 'video', label: 'Vídeo', icon: 'Play' },
  { type: 'file_download', label: 'Arquivo p/ Download', icon: 'Download' },
  { type: 'separator', label: 'Separador', icon: 'Minus' },
  { type: 'custom_button', label: 'Botão', icon: 'MousePointer' },
  { type: 'table', label: 'Tabela', icon: 'Table' },
  { type: 'accordion', label: 'Lista Expansível', icon: 'ChevronDown' },
  { type: 'tip', label: 'Dica', icon: 'Lightbulb' },
  { type: 'alert', label: 'Alerta', icon: 'AlertTriangle' },
  { type: 'strategy', label: 'Estratégia', icon: 'Target' },
  { type: 'checklist', label: 'Checklist', icon: 'CheckSquare' },
  { type: 'highlight', label: 'Destaque', icon: 'Star' },
];
