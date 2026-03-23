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
  | 'other';

export interface FlightLegDetail {
  airport_origin?: string;
  airport_destination?: string;
  departure_time?: string;
  arrival_time?: string;
  flight_number?: string;
}

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
  outbound_detail?: FlightLegDetail;
  return_detail?: FlightLegDetail;
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
  pickup_location: string;
  dropoff_location: string;
  car_type: string;
  days: number;
  price: number;
  notes: string;
}

export interface TransferData {
  transfer_type: 'arrival' | 'departure';
  location: string;
  date: string;
  price: number;
}

/** Used internally by the form — the round_trip option generates two TransferData entries */
export type TransferFormType = 'arrival' | 'departure' | 'round_trip';

export interface AttractionData {
  name: string;
  date: string;
  quantity: number;
  price: number;
}

export interface InsuranceData {
  provider: string;
  start_date: string;
  end_date: string;
  coverage: string;
  price: number;
}

export interface CruiseData {
  ship_name: string;
  route: string;
  start_date: string;
  end_date: string;
  cabin_type: string;
  price: number;
}

export interface OtherServiceData {
  description: string;
  price: number;
}

export type ServiceData = 
  | FlightData 
  | HotelData 
  | CarRentalData 
  | TransferData 
  | AttractionData 
  | InsuranceData 
  | CruiseData 
  | OtherServiceData;

export interface QuoteFormData {
  client_id?: string;
  client_name: string;
  adults_count: number;
  children_count: number;
  destination: string;
  start_date: string;
  end_date: string;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  flight: 'Passagem Aérea',
  hotel: 'Hospedagem',
  car_rental: 'Locação de Veículo',
  transfer: 'Transfer',
  attraction: 'Ingressos/Atrações',
  insurance: 'Seguro Viagem',
  cruise: 'Cruzeiro',
  other: 'Outros Serviços',
};

export const MULTI_OPTION_TYPES: ServiceType[] = ['flight', 'hotel'];
