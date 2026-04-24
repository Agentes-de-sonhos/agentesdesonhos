export interface TripAttachment {
  url: string;
  name: string;
}

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
  slug: string | null;
  short_code: string | null;
  created_at: string;
  updated_at: string;
  services?: TripService[];
  is_locked?: boolean | null;
  failed_password_attempts?: number | null;
}

export interface TripService {
  id: string;
  trip_id: string;
  service_type: TripServiceType;
  service_data: TripServiceData;
  voucher_url: string | null;
  voucher_name: string | null;
  image_url: string | null;
  attachments: TripAttachment[];
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

export interface TripFlightSegment {
  origin_airport: string;
  origin_city: string;
  destination_airport: string;
  destination_city: string;
  flight_date: string;
  departure_time: string;
  arrival_time: string;
  flight_number: string;
  airline: string;
  terminal: string;
  gate: string;
  segment_type: 'ida' | 'conexao' | 'volta';
}

export interface TripFlightPassenger {
  name: string;
  passenger_type: 'adulto' | 'crianca' | 'bebe';
  document: string;
  seat: string;
  notes: string;
}

export interface TripFlightData {
  // Summary
  main_airline: string;
  origin_city: string;
  destination_city: string;
  trip_type: 'ida' | 'ida_volta' | 'multi_trechos';
  locator_code: string;
  flight_status: 'confirmado' | 'emitido' | 'pendente';
  // Segments
  segments: TripFlightSegment[];
  // Passengers
  passengers: TripFlightPassenger[];
  // Baggage
  carry_on: string;
  checked_baggage: string;
  extra_baggage: string;
  baggage_rules: string;
  baggage_notes: string;
  // Check-in
  checkin_url: string;
  checkin_status: 'pendente' | 'realizado';
  checkin_open_date: string;
  checkin_notes: string;
  // Boarding instructions
  recommended_arrival: string;
  boarding_terminal: string;
  required_documents: string;
  immigration_rules: string;
  boarding_notes: string;
  // Legacy compat
  airline: string;
  departure_date: string;
  return_date: string;
  notes: string;
}

export interface TripHotelGuest {
  name: string;
  age: string;
  notes: string;
}

export interface TripHotelData {
  // Main info
  hotel_name: string;
  hotel_category: string;
  city: string;
  country: string;
  check_in: string;
  check_out: string;
  room_type: string;
  reservation_status: 'confirmada' | 'emitida' | 'pre_reserva' | '';
  reservation_code: string;
  // Check-in details
  checkin_time: string;
  early_checkin: string;
  checkin_holder: string;
  checkin_instructions: string;
  late_arrival_policy: string;
  // Check-out details
  checkout_time: string;
  late_checkout: string;
  late_checkout_fee: string;
  checkout_instructions: string;
  checkout_procedure: string;
  // Room details
  bed_type: string;
  guest_count: string;
  room_view: string;
  meal_plan: string;
  cleaning_policy: string;
  amenities: string;
  // Location & Contact
  address: string;
  hotel_phone: string;
  hotel_email: string;
  hotel_website: string;
  maps_url: string;
  // Food & Beverage
  breakfast_hours: string;
  restaurants_included: string;
  food_notes: string;
  all_inclusive_rules: string;
  // What's included
  breakfast_included: string;
  wifi_included: string;
  taxes_included: string;
  resort_fee: string;
  parking_included: string;
  transfer_included: string;
  other_inclusions: string;
  // Policies
  cancellation_policy: string;
  change_policy: string;
  children_policy: string;
  pet_policy: string;
  mandatory_fees: string;
  hotel_deposit: string;
  hotel_deposit_method: string;
  // Guests
  guests: TripHotelGuest[];
  special_requests: string;
  // Agency notes
  agency_notes: string;
  // Legacy compat
  notes: string;
}

export interface TripCarRentalDriver {
  name: string;
  document: string;
  age: string;
  notes: string;
}

export interface TripCarRentalData {
  // Rental company
  rental_company: string;
  reservation_code: string;
  reservation_status: 'confirmada' | 'emitida' | 'a_retirar';
  // Pickup
  pickup_location: string;
  pickup_address: string;
  pickup_city: string;
  pickup_country: string;
  pickup_date: string;
  pickup_time: string;
  pickup_terminal: string;
  pickup_instructions: string;
  pickup_phone: string;
  pickup_maps_url: string;
  // Dropoff
  dropoff_location: string;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_country: string;
  dropoff_date: string;
  dropoff_time: string;
  dropoff_instructions: string;
  dropoff_late_policy: string;
  // Vehicle
  car_type: string;
  car_model: string;
  transmission: 'automatico' | 'manual' | '';
  fuel_type: string;
  doors: string;
  passenger_capacity: string;
  luggage_capacity: string;
  plate: string;
  car_notes: string;
  // Insurance
  basic_insurance: string;
  full_insurance: string;
  third_party_protection: string;
  theft_protection: string;
  damage_protection: string;
  deductible: string;
  insurance_coverage: string;
  insurance_notes: string;
  // Deposit & payment
  deposit_amount: string;
  deposit_method: string;
  card_in_driver_name: string;
  payment_method: string;
  payment_status: string;
  // Drivers
  drivers: TripCarRentalDriver[];
  additional_driver_fee: string;
  // Fuel policy
  fuel_policy: string;
  fuel_rules: string;
  fuel_penalty: string;
  fuel_notes: string;
  // Important info
  required_documents: string;
  minimum_age: string;
  international_permit: string;
  traffic_rules: string;
  emergency_contact: string;
  agency_contact: string;
  // General
  notes: string;
}

export interface TripTransferPassenger {
  name: string;
  age: string;
  passenger_type: 'adulto' | 'crianca' | 'bebe';
  needs_child_seat: string;
  notes: string;
}

export interface TripTransferData {
  // Main info
  transfer_type: 'arrival' | 'departure' | 'inter_hotel';
  transfer_mode: 'privativo' | 'compartilhado' | 'shuttle' | '';
  transfer_status: 'confirmado' | 'agendado' | 'pendente' | '';
  city: string;
  date: string;
  time: string;
  origin_location: string;
  destination_location: string;
  company_name: string;
  reservation_code: string;
  // Arrival details (Transfer IN)
  flight_number: string;
  arrival_time: string;
  arrival_airport: string;
  arrival_terminal: string;
  driver_wait_time: string;
  reception_type: string;
  meeting_instructions: string;
  // Departure details (Transfer OUT)
  hotel_departure_time: string;
  departure_flight_time: string;
  departure_airport: string;
  recommended_departure: string;
  boarding_point: string;
  departure_alert: string;
  // Pickup & Dropoff locations
  pickup_address: string;
  pickup_maps_url: string;
  destination_address: string;
  destination_maps_url: string;
  location_notes: string;
  // Driver & Contact
  driver_name: string;
  driver_phone: string;
  driver_language: string;
  vehicle_plate: string;
  // Vehicle
  vehicle_type: string;
  vehicle_capacity: string;
  luggage_capacity: string;
  air_conditioning: string;
  accessibility: string;
  vehicle_notes: string;
  // Passengers
  passengers: TripTransferPassenger[];
  adults_count: string;
  children_count: string;
  // Important info
  required_documents: string;
  emergency_contact: string;
  agency_contact: string;
  plan_b: string;
  agency_notes: string;
  // Legacy compat
  location: string;
  notes: string;
}

export interface TripAttractionPassenger {
  name: string;
  ticket_type: 'adulto' | 'crianca' | 'senior';
  document: string;
  notes: string;
}

export interface TripAttractionData {
  // Main info
  name: string;
  attraction_type: 'parque' | 'show' | 'passeio' | 'museu' | 'tour' | 'evento' | 'experiencia' | '';
  city: string;
  country: string;
  date: string;
  status: 'confirmado' | 'reservado' | 'flexivel' | 'utilizado' | '';
  quantity: number;
  // Usage details
  entry_time: string;
  usage_window: string;
  duration: string;
  access_type: '1_dia' | 'multi_day' | 'open_date' | 'horario_marcado' | '';
  requires_reservation: string;
  usage_instructions: string;
  // QR Code / Tickets
  ticket_code: string;
  confirmation_code: string;
  order_number: string;
  // Location
  address: string;
  venue_name: string;
  maps_url: string;
  entry_point: string;
  // Passengers
  passengers: TripAttractionPassenger[];
  // Policies
  cancellation_policy: string;
  change_policy: string;
  attraction_rules: string;
  prohibited_items: string;
  dress_code: string;
  required_documents: string;
  // Agency tips
  agency_tips: string;
  // Contacts
  attraction_contact: string;
  operator_contact: string;
  agency_contact: string;
  emergency_contact: string;
  // Agency notes
  agency_notes: string;
  // Legacy
  notes: string;
}

export interface TripInsuredPerson {
  name: string;
  birth_date: string;
  document: string;
  coverage_type: 'individual' | 'familiar' | '';
  notes: string;
}

export interface TripInsuranceCoverage {
  name: string;
  value: string;
  included: boolean;
}

export interface TripInsuranceData {
  // Main info
  provider: string;
  plan_name: string;
  policy_number: string;
  destination_covered: string;
  coverage_type: 'internacional' | 'nacional' | 'schengen' | 'global' | '';
  start_date: string;
  end_date: string;
  status: 'ativo' | 'expirado' | 'futuro' | '';
  // Coverages
  medical_assistance: string;
  hospital_expenses: string;
  lost_baggage: string;
  trip_cancellation: string;
  trip_interruption: string;
  dental_assistance: string;
  medical_repatriation: string;
  covid_coverage: string;
  coverage: string;
  // Emergency contacts
  emergency_phone: string;
  emergency_whatsapp: string;
  emergency_email: string;
  emergency_24h: string;
  emergency_languages: string;
  insurer_website: string;
  // Emergency procedure
  how_to_activate: string;
  required_documents_claim: string;
  hospital_procedure: string;
  reimbursement_info: string;
  // Insured persons
  insured_persons: TripInsuredPerson[];
  // Trip details
  trip_purpose: 'lazer' | 'negocios' | 'intercambio' | '';
  special_activities: string;
  coverage_observations: string;
  // Agency tips
  agency_tips: string;
  agency_notes: string;
  agency_contact: string;
  emergency_contact_agency: string;
  // Legacy compat
  notes: string;
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
  // Main info
  service_name: string;
  other_service_type: 'restaurante' | 'guia_turistico' | 'chip_internet' | 'experiencia' | 'evento' | 'spa_wellness' | 'servico_vip' | 'concierge' | 'personalizado' | '';
  custom_type_name: string;
  city: string;
  country: string;
  date: string;
  time: string;
  duration: string;
  status: 'confirmado' | 'agendado' | 'opcional' | '';
  // Location
  location_name: string;
  address: string;
  maps_url: string;
  meeting_point: string;
  how_to_arrive: string;
  // Contact
  contact_name: string;
  contact_company: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_language: string;
  // Reservation
  reservation_code: string;
  // Chip/Internet specific
  chip_operator: string;
  chip_type: 'esim' | 'fisico' | '';
  chip_activation_instructions: string;
  chip_activation_url: string;
  chip_support: string;
  // Guide specific
  guide_name: string;
  guide_language: string;
  guide_tour_time: string;
  guide_tour_duration: string;
  guide_meeting_point: string;
  // Agency
  agency_tips: string;
  agency_notes: string;
  agency_contact: string;
  emergency_contact: string;
  // Legacy compat
  description: string;
  notes: string;
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
  client_id?: string;
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
  other: 'Outros Serviços',
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
