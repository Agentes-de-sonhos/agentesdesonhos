import type {
  Quote, QuoteService, FlightData, HotelData, CarRentalData, TransferData,
  AttractionData, InsuranceData, CruiseData, OtherServiceData, CircuitData,
} from "@/types/quote";
import type {
  TripServiceType, TripServiceData, TripFlightSegment, TripFormData,
} from "@/types/trip";

/**
 * Convert a Quote into the TripFormData (header) needed to create a wallet.
 * Drops every monetary field — wallets are operational, not financial.
 */
export function extractTripFormDataFromQuote(quote: Quote): TripFormData {
  return {
    client_id: (quote as any).client_id || undefined,
    client_name: quote.client_name,
    destination: quote.destination,
    start_date: quote.start_date,
    end_date: quote.end_date,
  };
}

function mapFlight(d: FlightData): { type: TripServiceType; data: TripServiceData } {
  const segments: TripFlightSegment[] = [];
  const outbound = (d.outbound_legs && d.outbound_legs.length > 0)
    ? d.outbound_legs
    : (d.outbound_detail ? [d.outbound_detail] : []);
  const ret = (d.return_legs && d.return_legs.length > 0)
    ? d.return_legs
    : (d.return_detail ? [d.return_detail] : []);

  outbound.forEach((leg, i) => {
    segments.push({
      origin_airport: leg.airport_origin || "",
      origin_city: i === 0 ? (d.origin_city || "") : "",
      destination_airport: leg.airport_destination || "",
      destination_city: i === outbound.length - 1 ? (d.destination_city || "") : "",
      flight_date: leg.leg_date || d.departure_date || "",
      departure_time: leg.departure_time || "",
      arrival_time: leg.arrival_time || "",
      flight_number: leg.flight_number || "",
      airline: d.airline || "",
      terminal: "",
      gate: "",
      segment_type: i === 0 ? "ida" : "conexao",
    });
  });
  ret.forEach((leg, i) => {
    segments.push({
      origin_airport: leg.airport_origin || "",
      origin_city: i === 0 ? (d.destination_city || "") : "",
      destination_airport: leg.airport_destination || "",
      destination_city: i === ret.length - 1 ? (d.origin_city || "") : "",
      flight_date: leg.leg_date || d.return_date || "",
      departure_time: leg.departure_time || "",
      arrival_time: leg.arrival_time || "",
      flight_number: leg.flight_number || "",
      airline: d.airline || "",
      terminal: "",
      gate: "",
      segment_type: "volta",
    });
  });

  return {
    type: "flight",
    data: {
      main_airline: d.airline || "",
      origin_city: d.origin_city || "",
      destination_city: d.destination_city || "",
      trip_type: ret.length > 0 ? "ida_volta" : "ida",
      locator_code: "",
      flight_status: "pendente",
      segments,
      passengers: [],
      carry_on: "", checked_baggage: d.includes_baggage ? "Sim" : "",
      extra_baggage: "", baggage_rules: "", baggage_notes: "",
      checkin_url: "", checkin_status: "pendente", checkin_open_date: "", checkin_notes: "",
      recommended_arrival: "", boarding_terminal: "", required_documents: "",
      immigration_rules: "", boarding_notes: "",
      airline: d.airline || "",
      departure_date: d.departure_date || "",
      return_date: d.return_date || "",
      notes: d.notes || "",
    } as any,
  };
}

function mapHotel(d: HotelData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "hotel",
    data: {
      hotel_name: d.hotel_name || "",
      hotel_category: "",
      city: d.city || "",
      country: "",
      check_in: d.check_in || "",
      check_out: d.check_out || "",
      room_type: d.room_type || "",
      reservation_status: "",
      reservation_code: "",
      checkin_time: "", early_checkin: "", checkin_holder: "",
      checkin_instructions: "", late_arrival_policy: "",
      checkout_time: "", late_checkout: "", late_checkout_fee: "",
      checkout_instructions: "", checkout_procedure: "",
      bed_type: "", guest_count: "", room_view: "",
      meal_plan: d.meal_plan || "",
      cleaning_policy: "", amenities: "",
      address: "", hotel_phone: "", hotel_email: "", hotel_website: "", maps_url: "",
      breakfast_hours: "", restaurants_included: "", food_notes: "", all_inclusive_rules: "",
      breakfast_included: "", wifi_included: "", taxes_included: "", resort_fee: "",
      parking_included: "", transfer_included: "", other_inclusions: "",
      cancellation_policy: "", change_policy: "", children_policy: "", pet_policy: "",
      mandatory_fees: "", hotel_deposit: "", hotel_deposit_method: "",
      guests: [], special_requests: "",
      agency_notes: "",
      notes: d.notes || "",
    } as any,
  };
}

function mapCarRental(d: CarRentalData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "car_rental",
    data: {
      rental_company: d.rental_company || "",
      reservation_code: "", reservation_status: "confirmada",
      pickup_location: d.pickup_location || "", pickup_address: "", pickup_city: "", pickup_country: "",
      pickup_date: d.pickup_date || "", pickup_time: d.pickup_time || "",
      pickup_terminal: "", pickup_instructions: "", pickup_phone: "", pickup_maps_url: "",
      dropoff_location: d.dropoff_location || "", dropoff_address: "", dropoff_city: "", dropoff_country: "",
      dropoff_date: d.dropoff_date || "", dropoff_time: d.dropoff_time || "",
      dropoff_instructions: "", dropoff_late_policy: "",
      car_type: d.car_type || "", car_model: "", transmission: "", fuel_type: "",
      doors: "", passenger_capacity: "", luggage_capacity: "", plate: "", car_notes: "",
      basic_insurance: "", full_insurance: "", third_party_protection: "", theft_protection: "",
      damage_protection: "", deductible: "", insurance_coverage: "", insurance_notes: "",
      deposit_amount: "", deposit_method: "", card_in_driver_name: "",
      payment_method: "", payment_status: "",
      drivers: [], additional_driver_fee: "",
      fuel_policy: "", fuel_rules: "", fuel_penalty: "", fuel_notes: "",
      required_documents: "", minimum_age: "", international_permit: "",
      traffic_rules: "", emergency_contact: "", agency_contact: "",
      notes: d.notes || "",
    } as any,
  };
}

function mapTransfer(d: TransferData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "transfer",
    data: {
      transfer_type: d.transfer_type === "departure" ? "departure" : "arrival",
      transfer_mode: "", transfer_status: "",
      city: "", date: d.date || "", time: "",
      origin_location: "", destination_location: d.location || "",
      company_name: d.company_name || "", reservation_code: "",
      flight_number: "", arrival_time: "", arrival_airport: "", arrival_terminal: "",
      driver_wait_time: "", reception_type: "", meeting_instructions: "",
      hotel_departure_time: "", departure_flight_time: "", departure_airport: "",
      recommended_departure: "", boarding_point: "", departure_alert: "",
      pickup_address: "", pickup_maps_url: "",
      destination_address: "", destination_maps_url: "", location_notes: "",
      driver_name: "", driver_phone: "", driver_language: "", vehicle_plate: "",
      vehicle_type: "", vehicle_capacity: "", luggage_capacity: "",
      air_conditioning: "", accessibility: "", vehicle_notes: "",
      passengers: [], adults_count: "", children_count: "",
      required_documents: "", emergency_contact: "", agency_contact: "",
      plan_b: "", agency_notes: "",
      location: d.location || "",
      notes: "",
    } as any,
  };
}

function mapAttraction(d: AttractionData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "attraction",
    data: {
      name: d.name || d.product_name || "",
      attraction_type: "", city: "", country: "",
      date: d.date || "", status: "",
      quantity: d.quantity || 1,
      entry_time: "", usage_window: "", duration: "",
      access_type: "", requires_reservation: "", usage_instructions: "",
      ticket_code: "", confirmation_code: "", order_number: "",
      address: "", venue_name: "", maps_url: "", entry_point: "",
      passengers: [],
      cancellation_policy: "", change_policy: "", attraction_rules: "",
      prohibited_items: "", dress_code: "", required_documents: "",
      agency_tips: "",
      attraction_contact: "", operator_contact: "", agency_contact: "", emergency_contact: "",
      agency_notes: "",
      notes: d.ticket_type || "",
    } as any,
  };
}

function mapInsurance(d: InsuranceData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "insurance",
    data: {
      provider: d.provider || "",
      plan_name: "", policy_number: "", destination_covered: "",
      coverage_type: "",
      start_date: d.start_date || "", end_date: d.end_date || "",
      status: "",
      medical_assistance: "", hospital_expenses: "", lost_baggage: "",
      trip_cancellation: "", trip_interruption: "", dental_assistance: "",
      medical_repatriation: "", covid_coverage: "",
      coverage: d.coverage || "",
      emergency_phone: "", emergency_whatsapp: "", emergency_email: "",
      emergency_24h: "", emergency_languages: "", insurer_website: "",
      how_to_activate: "", required_documents_claim: "",
      hospital_procedure: "", reimbursement_info: "",
      insured_persons: [],
      trip_purpose: "", special_activities: "", coverage_observations: "",
      agency_tips: "", agency_notes: "", agency_contact: "", emergency_contact_agency: "",
      notes: d.notes || "",
    } as any,
  };
}

function mapCruise(d: CruiseData): { type: TripServiceType; data: TripServiceData } {
  return {
    type: "cruise",
    data: {
      cruise_company: "", ship_name: d.ship_name || "",
      route: d.route || "",
      embarkation_port: "", disembarkation_port: "",
      start_date: d.start_date || "", end_date: d.end_date || "",
      booking_number: "",
      cabin_type: d.cabin_type || "", cabin_number: "", cabin_category: "",
      deck: "", occupancy: "", meal_plan: "",
      passengers: [], itinerary: [],
      checkin_url: "", checkin_status: "", checkin_deadline: "",
      boarding_terminal: "", port_address: "", port_maps_url: "",
      recommended_arrival: "", required_documents: "", baggage_policy: "",
      dress_code: "", company_rules: "", boarding_notes: d.notes || "",
      onboard_currency: "", onboard_language: "", voltage: "", ship_website: "",
    } as any,
  };
}

function mapOther(d: OtherServiceData | CircuitData, fallbackTitle?: string): { type: TripServiceType; data: TripServiceData } {
  const isCircuit = (d as CircuitData).circuit_name !== undefined;
  const name = isCircuit
    ? (d as CircuitData).circuit_name
    : ((d as OtherServiceData).custom_title || fallbackTitle || "Outros Serviços");
  const description = isCircuit
    ? `${(d as CircuitData).itinerary || ""}${(d as CircuitData).notes ? "\n" + (d as CircuitData).notes : ""}`.trim()
    : (d as OtherServiceData).description || "";
  return {
    type: "other",
    data: {
      service_name: name,
      other_service_type: "personalizado",
      custom_type_name: name,
      city: "", country: "",
      date: "", time: "", duration: (d as CircuitData).duration || "",
      status: "",
      location_name: "", address: "", maps_url: "",
      meeting_point: "", how_to_arrive: "",
      contact_name: "",
      contact_company: (d as OtherServiceData).company_name || "",
      contact_phone: "", contact_whatsapp: "", contact_email: "", contact_language: "",
      reservation_code: "",
      chip_operator: "", chip_type: "", chip_activation_instructions: "",
      chip_activation_url: "", chip_support: "",
      guide_name: "", guide_language: "", guide_tour_time: "",
      guide_tour_duration: "", guide_meeting_point: "",
      agency_tips: "", agency_notes: "", agency_contact: "", emergency_contact: "",
      description,
      notes: "",
    } as any,
  };
}

/**
 * Convert a single QuoteService into the equivalent trip service.
 * Returns null if the type cannot be mapped.
 */
export function mapQuoteServiceToTripService(qs: QuoteService): { type: TripServiceType; data: TripServiceData; image_url: string | null } | null {
  const sd: any = qs.service_data;
  let mapped: { type: TripServiceType; data: TripServiceData } | null = null;

  switch (qs.service_type) {
    case "flight": mapped = mapFlight(sd as FlightData); break;
    case "hotel": mapped = mapHotel(sd as HotelData); break;
    case "car_rental": mapped = mapCarRental(sd as CarRentalData); break;
    case "transfer": mapped = mapTransfer(sd as TransferData); break;
    case "attraction": mapped = mapAttraction(sd as AttractionData); break;
    case "insurance": mapped = mapInsurance(sd as InsuranceData); break;
    case "cruise": mapped = mapCruise(sd as CruiseData); break;
    case "circuit":
    case "other":
      mapped = mapOther(sd, qs.option_label || undefined); break;
    default: return null;
  }

  return {
    type: mapped.type,
    data: mapped.data,
    image_url: qs.image_url || (qs.image_urls && qs.image_urls[0]) || null,
  };
}

/**
 * Insert all mapped services into trip_services for a given trip.
 * Pass the supabase client and the starting order_index.
 */
export async function insertQuoteServicesIntoTrip(
  supabase: any,
  tripId: string,
  quoteServices: QuoteService[],
  startOrderIndex: number = 0,
): Promise<number> {
  const rows = quoteServices
    .map(mapQuoteServiceToTripService)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map((m, i) => ({
      trip_id: tripId,
      service_type: m.type,
      service_data: m.data as any,
      image_url: m.image_url,
      attachments: [] as any,
      order_index: startOrderIndex + i,
    }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("trip_services").insert(rows);
  if (error) throw error;
  return rows.length;
}