export interface Benefit {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  title: string;
  short_description: string | null;
  full_description: string | null;
  destination: string | null;
  category: string;
  tags: string[];
  requirements: string | null;
  how_to_claim: string | null;
  official_link: string | null;
  status: string;
  is_active: boolean;
  confirmations_count: number;
  not_available_count: number;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface BenefitConfirmation {
  id: string;
  benefit_id: string;
  user_id: string;
  confirmation_type: string;
  created_at: string;
}

export interface BenefitComment {
  id: string;
  benefit_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export const BENEFIT_CATEGORIES = [
  { value: 'companhia_aerea', label: 'Companhia Aérea' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'locadora_veiculos', label: 'Locadora de Veículos' },
  { value: 'cruzeiros', label: 'Cruzeiros' },
  { value: 'seguro_viagem', label: 'Seguro Viagem' },
  { value: 'parques_atracoes', label: 'Parques e Atrações' },
  { value: 'outros', label: 'Outros' },
];

