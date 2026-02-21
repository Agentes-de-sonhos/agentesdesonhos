export interface Trip {
  id: string;
  user_id: string;
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'archived';
  share_token: string | null;
  access_password: string | null;
  created_at: string;
  updated_at: string;
  services?: TripService[];
}

export interface TripService {
  id: string;
  trip_id: string;
  service_type: TripServiceType;
  service_data: TripServiceData;
  voucher_url: string | null;
  voucher_name: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type TripServiceType = 
  | 'flight'
  | 'hotel'
  | 'car_rental'
  | 'transfer'
  | 'attraction'
  | 'insurance'
  | 'cruise'
  | 'train'
  | 'other';

export interface TripFlightData {
  origin_city: string;
  destination_city: string;
  airline: string;
  departure_date: string;
  return_date: string;
  notes: string;
}

export interface TripHotelData {
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  notes: string;
}

export interface TripCarRentalData {
  pickup_location: string;
  dropoff_location: string;
  car_type: string;
  notes: string;
}

export interface TripTransferData {
  transfer_type: 'arrival' | 'departure';
  location: string;
  date: string;
}

export interface TripAttractionData {
  name: string;
  date: string;
  quantity: number;
}

export interface TripInsuranceData {
  provider: string;
  start_date: string;
  end_date: string;
  coverage: string;
}

export interface TripCruiseData {
  // Main info
  cruise_company: string;
  ship_name: string;
  route: string;
  embarkation_port: string;
  disembarkation_port: string;
  start_date: string;
  end_date: string;
  booking_number: string;
  // Cabin
  cabin_type: string;
  cabin_number: string;
  cabin_category: string;
  deck: string;
  occupancy: string;
  meal_plan: string;
  // Passengers
  passengers: { name: string; birth_date?: string; document?: string; notes?: string }[];
  // Itinerary
  itinerary: { date: string; port: string; arrival_time: string; departure_time: string; stop_type: string; notes: string }[];
  // Check-in
  checkin_url: string;
  checkin_status: string;
  checkin_deadline: string;
  // Boarding instructions
  boarding_terminal: string;
  port_address: string;
  port_maps_url: string;
  recommended_arrival: string;
  required_documents: string;
  baggage_policy: string;
  dress_code: string;
  company_rules: string;
  boarding_notes: string;
  // Ship operational
  onboard_currency: string;
  onboard_language: string;
  voltage: string;
  ship_website: string;
}

export interface TripTrainData {
  origin_city: string;
  origin_station: string;
  destination_city: string;
  destination_station: string;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  train_company: string;
  train_number: string;
  travel_class: string;
  coach: string;
  seat: string;
  platform: string;
  passengers: { name: string; notes?: string }[];
  boarding_notes: string;
  origin_maps_url: string;
  destination_maps_url: string;
}

export interface TripOtherData {
  description: string;
}

export type TripServiceData = 
  | TripFlightData 
  | TripHotelData 
  | TripCarRentalData 
  | TripTransferData 
  | TripAttractionData 
  | TripInsuranceData 
  | TripCruiseData 
  | TripTrainData
  | TripOtherData;

export interface TripFormData {
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export const TRIP_SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: 'Passagem Aérea',
  hotel: 'Hospedagem',
  car_rental: 'Locação de Veículo',
  transfer: 'Transfer',
  attraction: 'Ingressos/Atrações',
  insurance: 'Seguro Viagem',
  cruise: 'Cruzeiro',
  train: 'Trem',
  other: 'Outros',
};

export const TRIP_SERVICE_ICONS: Record<TripServiceType, string> = {
  flight: 'Plane',
  hotel: 'Hotel',
  car_rental: 'Car',
  transfer: 'Bus',
  attraction: 'Ticket',
  insurance: 'Shield',
  cruise: 'Ship',
  train: 'TrainFront',
  other: 'FileText',
};
