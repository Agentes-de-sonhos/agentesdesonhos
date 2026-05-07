export type TripProfile =
  | 'casal'
  | 'familia'
  | 'familia_crianca_pequena'
  | 'familia_adolescentes'
  | 'grupo_amigos'
  | 'solo'
  | 'lua_de_mel'
  | 'melhor_idade'
  | 'corporativo';

export type TravelInterest =
  | 'gastronomia'
  | 'vinhos'
  | 'cultura_historia'
  | 'religioso'
  | 'aventura'
  | 'natureza'
  | 'praia'
  | 'neve_esqui'
  | 'luxo'
  | 'compras'
  | 'vida_noturna'
  | 'parques_tematicos'
  | 'bem_estar_spa'
  | 'instagramaveis';

export type TravelPace = 'leve' | 'moderado' | 'intenso';

export type FlightPeriod = 'manha' | 'tarde' | 'noite';

export interface FlightInfo {
  period: FlightPeriod;
}

export type DestinationKind =
  | 'principal'
  | 'secundario'
  | 'bate_volta'
  | 'conexao'
  | 'extensao';

export type TransportMode =
  | 'aviao'
  | 'carro'
  | 'trem'
  | 'onibus'
  | 'transfer'
  | 'cruzeiro'
  | 'outro';

export interface ExtraDestination {
  city: string;
  kind: DestinationKind;
  nights?: number;
  transportFromPrevious?: TransportMode;
  notes?: string;
}

export const DESTINATION_KIND_LABELS: Record<DestinationKind, string> = {
  principal: 'Destino principal / cidade base',
  secundario: 'Destino secundário',
  bate_volta: 'Bate-volta (sem pernoite)',
  conexao: 'Conexão / pernoite curto',
  extensao: 'Extensão da viagem',
};

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  aviao: 'Avião',
  carro: 'Carro',
  trem: 'Trem',
  onibus: 'Ônibus',
  transfer: 'Transfer privativo',
  cruzeiro: 'Cruzeiro',
  outro: 'Outro',
};

export interface AdditionalPreferences {
  dietaryRestrictions?: string;
  localOrTouristy?: 'local' | 'touristy' | 'mix';
  exclusiveOrPopular?: 'exclusive' | 'popular' | 'mix';
  mobilityLimitations?: string;
  serviceContext?: string;
}

export interface ItineraryFormData {
  clientId?: string;
  clientName?: string;
  origin?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  travelersCount: number;
  adultsCount?: number;
  childrenCount?: number;
  tripType: TripProfile;
  budgetLevel: 'economico' | 'conforto' | 'luxo';
  interests: TravelInterest[];
  travelPace: TravelPace;
  additionalPreferences: AdditionalPreferences;
  outboundFlight?: FlightInfo;
  returnFlight?: FlightInfo;
  extraDestinations?: ExtraDestination[];
}

export interface Activity {
  id?: string;
  period: 'manha' | 'tarde' | 'noite';
  title: string;
  description: string | null;
  location: string | null;
  estimatedDuration: string | null;
  estimatedCost: string | null;
  orderIndex: number;
  isApproved: boolean;
}

export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  date: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  tripType: string;
  budgetLevel: string;
  status: 'draft' | 'generating' | 'review' | 'approved' | 'published';
  shareToken: string | null;
  publicAccessCode: string | null;
  createdAt: string;
  updatedAt: string;
  days?: ItineraryDay[];
}

export interface AIGeneratedDay {
  dayNumber: number;
  date: string;
  activities: {
    period: 'manha' | 'tarde' | 'noite';
    title: string;
    description: string;
    location: string;
    estimatedDuration: string;
    estimatedCost: string;
  }[];
}

export interface AIGeneratedItinerary {
  days: AIGeneratedDay[];
}

export const TRIP_PROFILE_LABELS: Record<TripProfile, string> = {
  casal: 'Casal',
  familia: 'Família',
  familia_crianca_pequena: 'Família com criança pequena',
  familia_adolescentes: 'Família com adolescentes',
  grupo_amigos: 'Grupo de amigos',
  solo: 'Viagem solo',
  lua_de_mel: 'Lua de mel',
  melhor_idade: 'Melhor idade',
  corporativo: 'Corporativo',
};

export const TRAVEL_INTEREST_LABELS: Record<TravelInterest, string> = {
  gastronomia: 'Gastronomia',
  vinhos: 'Vinhos / Vinícolas',
  cultura_historia: 'Cultura / História',
  religioso: 'Religioso / Espiritual',
  aventura: 'Aventura',
  natureza: 'Natureza / Ecoturismo',
  praia: 'Praia / Relaxamento',
  neve_esqui: 'Neve / Esqui',
  luxo: 'Luxo / Experiências Premium',
  compras: 'Compras',
  vida_noturna: 'Vida Noturna',
  parques_tematicos: 'Parques Temáticos',
  bem_estar_spa: 'Bem-estar / Spa',
  instagramaveis: 'Lugares Instagramáveis',
};

export const TRAVEL_INTEREST_ICONS: Record<TravelInterest, string> = {
  gastronomia: '🍽️',
  vinhos: '🍷',
  cultura_historia: '🏛️',
  religioso: '⛪',
  aventura: '🧗',
  natureza: '🌿',
  praia: '🏖️',
  neve_esqui: '⛷️',
  luxo: '💎',
  compras: '🛍️',
  vida_noturna: '🌙',
  parques_tematicos: '🎢',
  bem_estar_spa: '🧖',
  instagramaveis: '📸',
};

export const TRAVEL_PACE_LABELS: Record<TravelPace, string> = {
  leve: 'Leve — poucas atividades, mais tempo livre',
  moderado: 'Moderado — equilíbrio entre passeios e descanso',
  intenso: 'Intenso — aproveitar ao máximo cada dia',
};
