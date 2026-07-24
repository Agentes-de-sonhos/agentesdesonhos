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
  | 'instagramaveis'
  | 'esportes';

export type TravelPace = 'leve' | 'moderado' | 'intenso';

export type FlightPeriod = 'manha' | 'tarde' | 'noite';

export interface FlightInfo {
  period: FlightPeriod;
}

export type JourneyPeriod = 'madrugada' | 'manha' | 'tarde' | 'noite';

export interface JourneyInfo {
  transport: TransportMode;
  period: JourneyPeriod;
}

export const JOURNEY_PERIOD_LABELS: Record<JourneyPeriod, string> = {
  madrugada: 'Madrugada',
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

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

// ──────────────── PASSAGEIROS ────────────────

export type PassengerInterest =
  | 'gastronomia'
  | 'cultura'
  | 'historia'
  | 'compras'
  | 'natureza'
  | 'praia'
  | 'esportes'
  | 'futebol'
  | 'basquete'
  | 'parques'
  | 'vida_noturna'
  | 'relaxamento'
  | 'luxo'
  | 'experiencias_locais'
  | 'museus'
  | 'fotografia'
  | 'aventura'
  | 'shows'
  | 'vida_urbana';

export const PASSENGER_INTEREST_LABELS: Record<PassengerInterest, string> = {
  gastronomia: 'Gastronomia',
  cultura: 'Cultura',
  historia: 'História',
  compras: 'Compras',
  natureza: 'Natureza',
  praia: 'Praia',
  esportes: 'Esportes',
  futebol: 'Futebol',
  basquete: 'Basquete',
  parques: 'Parques',
  vida_noturna: 'Vida noturna',
  relaxamento: 'Relaxamento',
  luxo: 'Luxo',
  experiencias_locais: 'Experiências locais',
  museus: 'Museus',
  fotografia: 'Fotografia',
  aventura: 'Aventura',
  shows: 'Shows',
  vida_urbana: 'Vida urbana',
};

export type PassengerNeed =
  | 'mobilidade_reduzida'
  | 'restricao_alimentar'
  | 'intolerancia_alimentar'
  | 'gestante'
  | 'crianca_pequena'
  | 'ritmo_leve'
  | 'acessibilidade'
  | 'evitar_caminhadas_longas';

export const PASSENGER_NEED_LABELS: Record<PassengerNeed, string> = {
  mobilidade_reduzida: 'Mobilidade reduzida',
  restricao_alimentar: 'Restrição alimentar',
  intolerancia_alimentar: 'Intolerância alimentar',
  gestante: 'Gestante',
  crianca_pequena: 'Criança pequena',
  ritmo_leve: 'Ritmo leve',
  acessibilidade: 'Acessibilidade',
  evitar_caminhadas_longas: 'Evitar longas caminhadas',
};

export interface Passenger {
  name: string;
  age?: number;
  interests: PassengerInterest[];
  notes?: string;
  needs: PassengerNeed[];
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
  arrivalInfo?: JourneyInfo;
  departureInfo?: JourneyInfo;
  extraDestinations?: ExtraDestination[];
  passengers?: Passenger[];
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
  /** Custom photo chosen/uploaded by the agency for this activity. */
  photoUrl?: string | null;
  /** Voucher / document URLs attached to this activity. */
  documentUrls?: string[];
  /** Direct Google Maps URL for the activity's location. */
  mapsUrl?: string | null;
  /**
   * Optional link to a `trip_services` row when this V2 itinerary is bound
   * to a Carteira Digital trip. Lets the public day-by-day render a
   * "Ver serviço" chip that jumps to the matching wallet service card.
   */
  linkedTripServiceId?: string | null;
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
  coverImageUrl?: string | null;
  destinationIntroText?: string | null;
  destinationIntroImages?: string[];
  showDestinationIntro?: boolean;
  passengers?: { name: string; age?: number | null }[];
  passengerInterests?: string[];
  headline?: string | null;
  showPricingSection?: boolean;
  pricingContent?: string | null;
  clientId?: string | null;
  clientName?: string | null;
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
  esportes: 'Esportes (estádios, jogos, arenas)',
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
  esportes: '🏟️',
};

export const TRAVEL_PACE_LABELS: Record<TravelPace, string> = {
  leve: 'Leve — poucas atividades, mais tempo livre',
  moderado: 'Moderado — equilíbrio entre passeios e descanso',
  intenso: 'Intenso — aproveitar ao máximo cada dia',
};
