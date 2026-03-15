export interface PlaybookDestination {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  banner_url: string | null;
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
  attractions?: PlaybookAttraction[];
}

export const ATTRACTION_CATEGORIES = [
  'Observatórios',
  'Museus',
  'Passeios de barco',
  'Passeios aéreos',
  'Visitas guiadas',
  'Excursões de um dia',
  'Espetáculos',
  'Gastronomia',
  'Experiências únicas',
  'Transporte / serviços',
] as const;

export type AttractionCategory = typeof ATTRACTION_CATEGORIES[number];

export const ATTRACTION_TAGS = [
  'Imperdível',
  'Mais vendido',
  'Experiência premium',
  'Para primeira viagem',
] as const;

export type AttractionTag = typeof ATTRACTION_TAGS[number];

export interface PlaybookAttraction {
  id: string;
  name: string;
  short_description: string;
  category: AttractionCategory;
  price_from: number;
  rating: number;
  image_url: string;
  tags?: AttractionTag[];
  // Future fields
  duration_minutes?: number;
  neighborhood?: string;
  traveler_profile?: string;
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
  | 'insight'
  | 'sales_argument'
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
  { key: 'hospedagem', label: 'Hospedagem', icon: 'Hotel' },
  { key: 'atracoes', label: 'Atrações', icon: 'Camera' },
  { key: 'gastronomia', label: 'Gastronomia', icon: 'UtensilsCrossed' },
  { key: 'logistica_aerea', label: 'Logística Aérea', icon: 'Plane' },
  { key: 'logistica_terrestre', label: 'Logística Terrestre', icon: 'Car' },
  { key: 'documentacao', label: 'Documentação', icon: 'FileText' },
  { key: 'pacote_ideal', label: 'Pacote Ideal', icon: 'Package' },
  { key: 'viagens_combinadas', label: 'Viagens Combinadas', icon: 'Route' },
  { key: 'segredos_destino', label: 'Segredos do Destino', icon: 'Lightbulb' },
  { key: 'alertas_golpes', label: 'Alertas e Golpes', icon: 'AlertTriangle' },
  { key: 'mapa', label: 'Mapa', icon: 'MapPin' },
  { key: 'checklist_final', label: 'Checklist Final', icon: 'CheckSquare' },
] as const;

export const TRAVEL_ADVISOR_TABS = new Set(['hospedagem', 'atracoes', 'gastronomia']);

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
  { type: 'insight', label: 'Insight de Venda', icon: 'Zap' },
  { type: 'sales_argument', label: 'Argumento de Venda', icon: 'MessageSquareQuote' },
];
