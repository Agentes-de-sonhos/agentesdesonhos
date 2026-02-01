export interface PromoterPresentation {
  id: string;
  promoter_id: string;
  agency_name: string;
  agent_name: string;
  agent_email: string;
  agent_whatsapp: string;
  city: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  promoter?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface PromoterPresentationUsage {
  id: string;
  presentation_id: string;
  feature_name: string;
  used_at: string;
}

export interface StartPresentationData {
  agency_name: string;
  agent_name: string;
  agent_email: string;
  agent_whatsapp: string;
  city: string;
  state: string;
}

export const TRACKABLE_FEATURES = [
  'itinerary_generator',
  'content_creator',
  'quote_generator',
  'trip_wallet',
] as const;

export type TrackableFeature = typeof TRACKABLE_FEATURES[number];

export const FEATURE_LABELS: Record<TrackableFeature, string> = {
  itinerary_generator: 'Gerador de Roteiros',
  content_creator: 'Criador de Conteúdo',
  quote_generator: 'Gerador de Orçamentos',
  trip_wallet: 'Carteira Digital',
};

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
