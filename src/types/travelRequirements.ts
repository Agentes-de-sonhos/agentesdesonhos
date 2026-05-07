export interface PassengerData {
  full_name: string;
  birth_date: string;
  nationality: string;
  country_of_residence: string;
  passport_issuer: string;
  has_passport: boolean;
  passport_number?: string;
  passport_expiry?: string;
  existing_visas?: string;
  is_minor: boolean;
  unaccompanied_minor: boolean;
}

export interface ConnectionStop {
  country: string;
  airport: string;
  duration: string;
}

export type TripType = "turismo" | "negocios" | "estudo" | "transito" | "intercambio";

export interface TripData {
  destination_country: string;
  destination_city: string;
  departure_date: string;
  return_date: string;
  airline: string;
  trip_type: TripType;
  has_international_connection: boolean;
  connections: ConnectionStop[];
}

export interface VisaRequirement {
  country: string;
  type: string;
  required: boolean;
  processing_time?: string;
  recommended_advance?: string;
  estimated_cost?: string;
  official_url: string;
  notes?: string;
}

export interface AlertItem {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
}

export interface OfficialSource {
  name: string;
  url: string;
  category: string;
  last_known_update?: string;
}

export interface RequirementsResult {
  overall_status: "apt" | "attention" | "not_apt";
  status_summary: string;
  confidence: "baixo" | "medio" | "alto";
  documentation: {
    passport_required: boolean;
    rg_accepted: boolean;
    cnh_accepted: boolean;
    passport_min_validity_months?: number;
    blank_pages_required?: number;
    additional_proofs: string[];
    notes: string;
  };
  visas: VisaRequirement[];
  health: {
    mandatory_vaccines: string[];
    recommended_vaccines?: string[];
    international_certificate_required: boolean;
    travel_insurance_required: boolean;
    insurance_min_coverage?: string;
    sanitary_requirements?: string[];
    notes: string;
  };
  alerts: AlertItem[];
  official_sources: OfficialSource[];
  observations: string[];
}