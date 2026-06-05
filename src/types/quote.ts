export interface Quote {
  id: string;
  user_id: string;
  client_name: string;
  adults_count: number;
  children_count: number;
  destination: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'draft' | 'published';
  share_token: string | null;
  show_detailed_prices: boolean;
  payment_terms: string | null;
  valid_until: string | null;
  validity_disclaimer: string;
  created_at: string;
  updated_at: string;
  services?: QuoteService[];
}

export interface QuoteService {
  id: string;
  quote_id: string;
  service_type: ServiceType;
  service_data: ServiceData;
  amount: number;
  order_index: number;
  option_label: string | null;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export type ServiceType = 
  | 'flight'
  | 'hotel'
  | 'car_rental'
  | 'transfer'
  | 'attraction'
  | 'insurance'
  | 'cruise'
  | 'circuit'
  | 'rail_transport'
  | 'other';

export interface FlightLegDetail {
  leg_date?: string;
  airport_origin?: string;
  airport_destination?: string;
  departure_time?: string;
  arrival_time?: string;
  flight_number?: string;
  /** Extended fields preserved from AI airfare import */
  airline?: string;
  origin_city?: string;
  destination_city?: string;
  duration?: string;          // "HH:mm"
  stops?: number;
  equipment?: string;
  cabin?: string;
  fare_basis?: string;
  baggage_text?: string;
  baggage_carry_on?: boolean | null;
  baggage_hand?: boolean | null;
  baggage_checked?: boolean | null;
  baggage_checked_count?: number | null;
  alert?: string;
  /** Segment classification within the itinerary (ida, conexão, voo interno, etc.) */
  segment_type?: SegmentType;
}

export type SegmentType =
  | "outbound"
  | "outbound_connection"
  | "internal"
  | "return_connection"
  | "return"
  | "other";

export interface FlightData {
  origin_city: string;
  destination_city: string;
  airline: string;
  departure_date: string;
  return_date: string;
  includes_baggage: boolean;
  includes_boarding_fee: boolean;
  adult_price: number;
  child_price: number;
  notes: string;
  /** @deprecated Use outbound_legs instead */
  outbound_detail?: FlightLegDetail;
  /** @deprecated Use return_legs instead */
  return_detail?: FlightLegDetail;
  outbound_legs?: FlightLegDetail[];
  return_legs?: FlightLegDetail[];
  /** Internal/domestic flights between outbound and return, classified as "internal" */
  internal_legs?: FlightLegDetail[];
  /** Structured summary preserved from AI airfare import (does not change form UI) */
  imported_summary?: {
    fare_type?: string;          // RT / OW / MT
    passengers?: string;
    passenger_type?: string;     // ADT / CHD / INF
    currency?: string;           // USD / EUR / BRL
    total_original?: number | null;
    total_brl?: number | null;
    exchange_rate?: number | null;
    exchange_date?: string;
    fuel_tax?: string;
    observations?: string[];
    unidentified_fields?: string[];
    confidence?: number;
  };
}

export interface HotelData {
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  room_type: string;
  meal_plan: string;
  price: number;
  notes: string;
}

export interface CarRentalData {
  rental_company?: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date?: string;
  pickup_time?: string;
  dropoff_date?: string;
  dropoff_time?: string;
  car_type: string;
  days: number;
  price: number;
  notes: string;
}

export interface TransferData {
  transfer_type: 'arrival' | 'departure';
  company_name?: string;
  location: string;
  date: string;
  price: number;
}

/** Used internally by the form — the round_trip option generates two TransferData entries */
export type TransferFormType = 'arrival' | 'departure' | 'round_trip';

export interface AttractionData {
  name: string;
  product_name?: string;
  ticket_type?: string;
  date: string;
  quantity: number;
  price: number;
  adult_price?: number;
  child_price?: number;
}

export interface InsuranceData {
  provider: string;
  start_date: string;
  end_date: string;
  coverage: string;
  price: number;
  notes?: string;
}

export interface CruiseData {
  ship_name: string;
  route: string;
  start_date: string;
  end_date: string;
  cabin_type: string;
  price: number;
  notes?: string;
}

export interface OtherServiceData {
  company_name?: string;
  description: string;
  price: number;
  /** Título customizado do bloco "Outros Serviços". Se vazio, usa "Outros Serviços". */
  custom_title?: string;
}

export interface CircuitData {
  circuit_name: string;
  duration?: string;
  itinerary: string;
  notes?: string;
  price: number;
}

/**
 * Transporte Ferroviário — estrutura pensada para futura importação por IA
 * (Rail Europe, Eurail, Eurostar, etc). Campos extras são opcionais para
 * preservar compatibilidade com importadores e integrações futuras.
 */
export type RailTransportType =
  | 'high_speed'
  | 'regional'
  | 'night'
  | 'panoramic'
  | 'other';

export type RailTransportClass =
  | 'economy'
  | 'second'
  | 'first'
  | 'executive'
  | 'sleeper';

export interface RailTransportData {
  origin_city: string;
  origin_station?: string;
  destination_city: string;
  destination_station?: string;
  travel_date: string;
  departure_time?: string;
  arrival_time?: string;
  operator: string;
  rail_type: RailTransportType;
  travel_class: RailTransportClass;
  adults_count: number;
  children_count: number;
  infants_count: number;
  description?: string;
  whats_included?: string;
  notes?: string;
  features?: {
    wifi?: boolean;
    power_outlets?: boolean;
    meal_included?: boolean;
    assigned_seat?: boolean;
    private_cabin?: boolean;
    panoramic_view?: boolean;
  };
  /** Investimento — segue o mesmo padrão dos demais serviços */
  cost_value?: number;
  fees?: number;
  price: number;
  /** Preparado para integrações futuras (Rail Europe, Eurail, Eurostar) */
  booking_reference?: string;
  external_provider?: string;
}

export type ServiceData = 
  | FlightData 
  | HotelData 
  | CarRentalData 
  | TransferData 
  | AttractionData 
  | InsuranceData 
  | CruiseData 
  | CircuitData
  | RailTransportData
  | OtherServiceData;

export interface QuoteFormData {
  client_id?: string;
  client_name: string;
  adults_count: number;
  children_count: number;
  destination: string;
  start_date: string;
  end_date: string;
  currency?: string;
  currency_mode?: string;
  exchange_rate?: number | null;
  opportunity_id?: string | null;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  flight: 'Passagem Aérea',
  hotel: 'Hospedagem',
  car_rental: 'Locação de Veículo',
  transfer: 'Transfer',
  attraction: 'Ingressos/Atrações',
  insurance: 'Seguro Viagem',
  cruise: 'Cruzeiro',
  circuit: 'Circuitos',
  rail_transport: 'Transporte Ferroviário',
  other: 'Outros Serviços',
};

export const RAIL_TYPE_LABELS: Record<RailTransportType, string> = {
  high_speed: 'Trem de alta velocidade',
  regional: 'Trem regional',
  night: 'Trem noturno',
  panoramic: 'Trem panorâmico',
  other: 'Outro',
};

export const RAIL_CLASS_LABELS: Record<RailTransportClass, string> = {
  economy: 'Classe Econômica',
  second: 'Segunda Classe',
  first: 'Primeira Classe',
  executive: 'Executiva',
  sleeper: 'Cabine Leito',
};

export const MULTI_OPTION_TYPES: ServiceType[] = ['flight', 'hotel'];
