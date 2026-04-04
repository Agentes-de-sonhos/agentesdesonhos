import type { TripService, TripServiceType, TripFlightData, TripHotelData, TripTransferData, TripAttractionData, TripInsuranceData, TripCruiseData, TripTrainData, TripCarRentalData, TripOtherData } from "@/types/trip";
import type { CreateActivityData } from "@/hooks/useItineraryActivities";

type Period = "morning" | "afternoon" | "evening";

function timeToPeriod(time: string | undefined | null): Period {
  if (!time) return "morning";
  const hour = parseInt(time.split(":")[0], 10);
  if (isNaN(hour)) return "morning";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

interface ServiceActivity {
  title: string;
  description?: string;
  date: string;
  time?: string;
  period?: Period;
  location?: string;
}

function extractFlightActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripFlightData;
  const activities: ServiceActivity[] = [];

  if (data.segments && data.segments.length > 0) {
    for (const seg of data.segments) {
      if (!seg.flight_date) continue;
      const segLabel = seg.segment_type === 'ida' ? 'Ida' : seg.segment_type === 'volta' ? 'Volta' : 'Conexão';
      activities.push({
        title: `✈️ Voo ${seg.origin_city || seg.origin_airport} → ${seg.destination_city || seg.destination_airport}`,
        description: `${segLabel} • ${seg.airline || data.main_airline || ''} ${seg.flight_number || ''}\nSaída: ${seg.departure_time || '—'} | Chegada: ${seg.arrival_time || '—'}`.trim(),
        date: seg.flight_date,
        time: seg.departure_time || undefined,
      });
    }
  } else if (data.departure_date) {
    activities.push({
      title: `✈️ Voo ${data.origin_city || ''} → ${data.destination_city || ''}`,
      description: `${data.main_airline || data.airline || ''} • Localizador: ${data.locator_code || '—'}`,
      date: data.departure_date,
    });
    if (data.return_date) {
      activities.push({
        title: `✈️ Voo de retorno ${data.destination_city || ''} → ${data.origin_city || ''}`,
        description: `${data.main_airline || data.airline || ''}`,
        date: data.return_date,
      });
    }
  }

  return activities;
}

function extractHotelActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripHotelData;
  const activities: ServiceActivity[] = [];

  if (data.check_in) {
    activities.push({
      title: `🏨 Check-in: ${data.hotel_name || 'Hotel'}`,
      description: `Quarto: ${data.room_type || '—'} • Horário: ${data.checkin_time || '14:00'}${data.meal_plan ? '\nRefeição: ' + data.meal_plan : ''}`,
      date: data.check_in,
      time: data.checkin_time || "14:00",
      location: data.address || undefined,
    });
  }
  if (data.check_out) {
    activities.push({
      title: `🏨 Check-out: ${data.hotel_name || 'Hotel'}`,
      description: `Horário: ${data.checkout_time || '12:00'}${data.checkout_instructions ? '\n' + data.checkout_instructions : ''}`,
      date: data.check_out,
      time: data.checkout_time || "10:00",
      location: data.address || undefined,
    });
  }

  return activities;
}

function extractTransferActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripTransferData;
  const activities: ServiceActivity[] = [];

  if (data.date) {
    const typeLabel = data.transfer_type === 'arrival' ? 'Chegada' : data.transfer_type === 'departure' ? 'Saída' : 'Inter-hotel';
    activities.push({
      title: `🚐 Transfer ${typeLabel}: ${data.origin_location || ''} → ${data.destination_location || ''}`,
      description: `${data.company_name || ''} • ${data.transfer_mode || ''}${data.driver_name ? '\nMotorista: ' + data.driver_name : ''}`.trim(),
      date: data.date,
      time: data.time || undefined,
      location: data.pickup_address || undefined,
    });
  }

  return activities;
}

function extractAttractionActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripAttractionData;
  const activities: ServiceActivity[] = [];

  if (data.date) {
    activities.push({
      title: `🎫 ${data.name || 'Atração'}`,
      description: `${data.venue_name ? data.venue_name + ' • ' : ''}${data.entry_time ? 'Entrada: ' + data.entry_time : ''}${data.duration ? ' • Duração: ' + data.duration : ''}`.trim(),
      date: data.date,
      time: data.entry_time || undefined,
      location: data.address || undefined,
    });
  }

  return activities;
}

function extractInsuranceActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripInsuranceData;
  const activities: ServiceActivity[] = [];

  if (data.start_date) {
    activities.push({
      title: `🛡️ Início do Seguro: ${data.provider || 'Seguro Viagem'}`,
      description: `Plano: ${data.plan_name || '—'} • Apólice: ${data.policy_number || '—'}\nEmergência: ${data.emergency_phone || '—'}`,
      date: data.start_date,
      period: "morning",
    });
  }

  return activities;
}

function extractCruiseActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripCruiseData;
  const activities: ServiceActivity[] = [];

  if (data.start_date) {
    activities.push({
      title: `🚢 Embarque: ${data.ship_name || data.cruise_company || 'Cruzeiro'}`,
      description: `Porto: ${data.embarkation_port || '—'} • Cabine: ${data.cabin_type || ''} ${data.cabin_number || ''}`.trim(),
      date: data.start_date,
      time: data.recommended_arrival || undefined,
      location: data.port_address || undefined,
    });
  }
  if (data.end_date) {
    activities.push({
      title: `🚢 Desembarque: ${data.ship_name || data.cruise_company || 'Cruzeiro'}`,
      description: `Porto: ${data.disembarkation_port || '—'}`,
      date: data.end_date,
      period: "morning",
    });
  }
  // Itinerary stops
  if (data.itinerary && data.itinerary.length > 0) {
    for (const stop of data.itinerary) {
      if (stop.date && stop.port) {
        activities.push({
          title: `🚢 Parada: ${stop.port}`,
          description: `${stop.stop_type || ''} • Chegada: ${stop.arrival_time || '—'} | Saída: ${stop.departure_time || '—'}${stop.notes ? '\n' + stop.notes : ''}`.trim(),
          date: stop.date,
          time: stop.arrival_time || undefined,
        });
      }
    }
  }

  return activities;
}

function extractTrainActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripTrainData;
  const activities: ServiceActivity[] = [];

  if (data.travel_date) {
    activities.push({
      title: `🚂 Trem: ${data.origin_city || data.origin_station || ''} → ${data.destination_city || data.destination_station || ''}`,
      description: `${data.train_company || ''} ${data.train_number || ''} • Classe: ${data.travel_class || '—'}\nSaída: ${data.departure_time || '—'} | Chegada: ${data.arrival_time || '—'}`.trim(),
      date: data.travel_date,
      time: data.departure_time || undefined,
      location: data.origin_station || undefined,
    });
  }

  return activities;
}

function extractCarRentalActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripCarRentalData;
  const activities: ServiceActivity[] = [];

  if (data.pickup_date) {
    activities.push({
      title: `🚗 Retirada do veículo: ${data.rental_company || ''}`,
      description: `${data.car_type || ''} ${data.car_model || ''} • Local: ${data.pickup_location || '—'}${data.pickup_time ? '\nHorário: ' + data.pickup_time : ''}`.trim(),
      date: data.pickup_date,
      time: data.pickup_time || undefined,
      location: data.pickup_address || undefined,
    });
  }
  if (data.dropoff_date) {
    activities.push({
      title: `🚗 Devolução do veículo: ${data.rental_company || ''}`,
      description: `Local: ${data.dropoff_location || '—'}${data.dropoff_time ? '\nHorário: ' + data.dropoff_time : ''}`.trim(),
      date: data.dropoff_date,
      time: data.dropoff_time || undefined,
      location: data.dropoff_address || undefined,
    });
  }

  return activities;
}

function extractOtherActivities(service: TripService): ServiceActivity[] {
  const data = service.service_data as TripOtherData;
  const activities: ServiceActivity[] = [];

  if (data.date) {
    const typeName = data.custom_type_name || data.service_name || 'Serviço';
    activities.push({
      title: `📋 ${typeName}`,
      description: `${data.location_name ? data.location_name + ' • ' : ''}${data.duration ? 'Duração: ' + data.duration : ''}`.trim() || undefined,
      date: data.date,
      time: data.time || undefined,
      location: data.address || undefined,
    });
  }

  return activities;
}

const EXTRACTORS: Record<TripServiceType, (service: TripService) => ServiceActivity[]> = {
  flight: extractFlightActivities,
  hotel: extractHotelActivities,
  transfer: extractTransferActivities,
  attraction: extractAttractionActivities,
  insurance: extractInsuranceActivities,
  cruise: extractCruiseActivities,
  train: extractTrainActivities,
  car_rental: extractCarRentalActivities,
  other: extractOtherActivities,
};

export function servicesToActivities(
  services: TripService[],
  tripId: string
): CreateActivityData[] {
  const results: CreateActivityData[] = [];

  for (const service of services) {
    const extractor = EXTRACTORS[service.service_type];
    if (!extractor) continue;

    const serviceActivities = extractor(service);
    for (const sa of serviceActivities) {
      if (!sa.date) continue;
      const period = sa.period || timeToPeriod(sa.time);
      results.push({
        trip_id: tripId,
        day_date: sa.date,
        period,
        title: sa.title,
        description: sa.description,
        start_time: sa.time,
        location: sa.location,
        linked_service_id: service.id,
        origin: "servico",
      });
    }
  }

  // Sort by date then time
  results.sort((a, b) => {
    const dateCompare = a.day_date.localeCompare(b.day_date);
    if (dateCompare !== 0) return dateCompare;
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    return 0;
  });

  // Assign order_index per day+period
  const counters: Record<string, number> = {};
  for (const act of results) {
    const key = `${act.day_date}_${act.period}`;
    counters[key] = (counters[key] || 0);
    act.order_index = counters[key];
    counters[key]++;
  }

  return results;
}

/**
 * Build a text summary of existing service activities for AI context
 */
export function buildServiceContextForAI(
  services: TripService[],
  tripId: string
): string {
  const activities = servicesToActivities(services, tripId);
  if (activities.length === 0) return "";

  const byDate: Record<string, typeof activities> = {};
  for (const a of activities) {
    if (!byDate[a.day_date]) byDate[a.day_date] = [];
    byDate[a.day_date].push(a);
  }

  const PERIOD_LABELS: Record<string, string> = { morning: "Manhã", afternoon: "Tarde", evening: "Noite" };
  
  let text = "SERVIÇOS JÁ CONFIRMADOS (NÃO incluir sugestões que conflitem com estes horários):\n\n";
  for (const [date, acts] of Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))) {
    text += `Data ${date}:\n`;
    for (const a of acts) {
      text += `  - [${PERIOD_LABELS[a.period] || a.period}] ${a.start_time ? a.start_time + ' ' : ''}${a.title}\n`;
    }
    text += "\n";
  }

  return text;
}
