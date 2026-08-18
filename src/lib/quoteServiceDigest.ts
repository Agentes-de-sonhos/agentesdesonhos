/**
 * Resumo amigável de um serviço do orçamento, em linguagem de cliente.
 * Usado na escolha assistida (um serviço por vez) e na revisão final.
 * Puro: nada de I/O, nada de React.
 */
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteService, ServiceType } from "@/types/quote";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de veículo",
  transfer: "Transfer",
  attraction: "Ingressos e atrações",
  insurance: "Seguro viagem",
  cruise: "Cruzeiro",
  rail_transport: "Transporte ferroviário",
  circuit: "Circuito",
  other: "Outros serviços",
};

function fmtDate(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  try {
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    try {
      return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  }
}

function range(a?: string | null, b?: string | null): string | null {
  const start = fmtDate(a);
  const end = fmtDate(b);
  if (start && end) return `${start} a ${end}`;
  return start || end || null;
}

/** Título do serviço (o que o cliente reconhece). */
export function serviceDigestTitle(service: QuoteService): string {
  const data = (service.service_data as any) || {};
  const candidates = [
    service.option_label,
    data.custom_title,
    data.hotel_name,
    data.product_name,
    data.ship_name,
    data.circuit_name,
    data.provider,
    data.company_name,
    data.car_type,
    data.name,
  ];
  for (const c of candidates) {
    const value = typeof c === "string" ? c.trim() : "";
    if (value) return value;
  }
  return SERVICE_TYPE_LABELS[service.service_type as ServiceType] || "Serviço";
}

/** Linha curta de contexto (cidade, trajeto, navio…). */
export function serviceDigestSubtitle(service: QuoteService): string | null {
  const data = (service.service_data as any) || {};
  switch (service.service_type) {
    case "flight":
      return [data.airline, [data.origin_city, data.destination_city].filter(Boolean).join(" → ")]
        .filter(Boolean)
        .join(" • ") || null;
    case "hotel":
      return [data.city, data.meal_plan ? String(data.meal_plan).replace(/_/g, " ") : null]
        .filter(Boolean)
        .join(" • ") || null;
    case "transfer":
      return data.location || null;
    case "cruise":
      return data.route || null;
    case "rail_transport":
      return [data.origin_city, data.destination_city].filter(Boolean).join(" → ") || null;
    case "attraction":
      return data.ticket_type || data.city || null;
    case "insurance":
      return data.coverage ? `Cobertura ${data.coverage}` : null;
    case "car_rental":
      return data.pickup_location || null;
    case "circuit":
      return data.duration || null;
    default:
      return null;
  }
}

export interface ServiceDigestFact {
  label: string;
  value: string;
}

/** Fatos essenciais para o cliente decidir (datas, quantidades, condições). */
export function serviceDigestFacts(service: QuoteService): ServiceDigestFact[] {
  const data = (service.service_data as any) || {};
  const facts: ServiceDigestFact[] = [];
  const push = (label: string, value?: string | null) => {
    if (value && String(value).trim()) facts.push({ label, value: String(value).trim() });
  };

  switch (service.service_type) {
    case "flight":
      push("Ida", fmtDate(data.departure_date));
      push("Volta", data.is_one_way ? "Somente ida" : fmtDate(data.return_date));
      push("Bagagem", data.includes_baggage ? "Incluída" : null);
      push("Taxa de embarque", data.includes_boarding_fee ? "Incluída" : null);
      break;
    case "hotel": {
      push("Check-in", fmtDate(data.check_in));
      push("Check-out", fmtDate(data.check_out));
      const rooms = Array.isArray(data.rooms) ? data.rooms : [];
      if (rooms.length > 0) {
        push(
          rooms.length > 1 ? "Acomodações" : "Acomodação",
          rooms
            .map((r: any) => `${r.quantity || 1}x ${r.room_type || "Quarto"}`)
            .join(" • "),
        );
      } else {
        push("Acomodação", data.room_type ? String(data.room_type).replace(/_/g, " ") : null);
      }
      push("Regime", data.meal_plan ? String(data.meal_plan).replace(/_/g, " ") : null);
      break;
    }
    case "car_rental":
      push("Retirada", data.pickup_location);
      push("Devolução", data.dropoff_location);
      push("Diárias", data.days ? String(data.days) : null);
      break;
    case "transfer":
      push(
        "Tipo",
        data.transfer_type === "round_trip"
          ? "Ida e volta"
          : data.transfer_type === "arrival"
            ? "Chegada"
            : data.transfer_type === "departure"
              ? "Saída"
              : null,
      );
      push("Data", fmtDate(data.arrival_date || data.date));
      push("Retorno", fmtDate(data.departure_date));
      push("Serviço", data.service_category === "private" ? "Privativo" : data.service_category ? "Regular" : null);
      break;
    case "attraction":
      push("Data", fmtDate(data.date));
      push("Quantidade", data.quantity ? String(data.quantity) : null);
      push("Ingresso", data.ticket_type);
      break;
    case "insurance":
      push("Período", range(data.start_date, data.end_date));
      push("Cobertura", data.coverage);
      break;
    case "cruise":
      push("Período", range(data.start_date, data.end_date));
      push("Navio", data.ship_name);
      push("Rota", data.route);
      break;
    case "rail_transport":
      push("Data", fmtDate(data.travel_date));
      push("Horário", [data.departure_time, data.arrival_time].filter(Boolean).join(" → ") || null);
      push("Classe", data.travel_class ? String(data.travel_class).replace(/_/g, " ") : null);
      break;
    case "circuit":
      push("Duração", data.duration);
      push("Período", range(data.start_date, data.end_date));
      break;
    default:
      break;
  }
  return facts;
}

/** Texto livre (observações/descrição) que ajuda na decisão. */
export function serviceDigestNotes(service: QuoteService): string | null {
  const data = (service.service_data as any) || {};
  const text = [service.description, data.notes, data.description]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  return text || null;
}

/** Fotos do serviço, na ordem cadastrada. */
export function serviceDigestImages(service: QuoteService): string[] {
  const list = Array.isArray(service.image_urls) ? service.image_urls.filter(Boolean) : [];
  if (list.length > 0) return list;
  return service.image_url ? [service.image_url] : [];
}