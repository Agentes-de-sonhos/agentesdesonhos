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
}

export type CruiseTipoFilter = 'all' | 'Oceanico' | 'Fluvial' | 'Expedicao';
export type CruiseCategoriaFilter = 'all' | 'Luxo' | 'Premium' | 'Contemporaneo';

export interface CruiseFilters {
  search: string;
  tipo: CruiseTipoFilter;
  categoria: CruiseCategoriaFilter;
  regioes: string[];
  perfis: string[];
}
