export interface Regiao {
  id: string;
  nome: string;
  slug: string;
  ordem_exibicao: number;
  ativo: boolean;
}

export interface PerfilCliente {
  id: string;
  nome: string;
  slug: string;
  ordem_exibicao: number;
  ativo: boolean;
}

export interface CruiseOperatorProfile {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  short_description: string | null;
  specialties: string | null;
  website: string | null;
  instagram: string | null;
  social_links: Record<string, string> | null;
  how_to_sell: string | null;
  sales_channels: string | null;
  commercial_contacts: string | null;
  competitive_advantages: string | null;
  business_hours: Record<string, string> | null;
}

export interface CompanhiaMaritima {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  subtipo: string | null;
  descricao_curta: string | null;
  logo_url: string | null;
  website: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  regioes: Regiao[];
  perfis: PerfilCliente[];
  how_to_sell: string | null;
  sales_channels: string | null;
  commercial_contacts: string | null;
  specialties: string | null;
  social_links: Record<string, string> | null;
  /** Commercial profile matched from public.tour_operators (read-only join by normalized name). */
  operator?: CruiseOperatorProfile | null;
}

export type CruiseTipoFilter = 'all' | 'Oceanico' | 'Fluvial' | 'Expedicao';
export type CruiseCategoriaFilter = 'all' | 'Luxo' | 'Premium' | 'Contemporaneo';

export interface CruiseFilters {
  search: string;
  tipo: CruiseTipoFilter;
  categoria: CruiseCategoriaFilter;
  subtipos: string[];
  regioes: string[];
  perfis: string[];
}
