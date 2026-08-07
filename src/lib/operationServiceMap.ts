import type { AIImportServiceType } from "@/components/shared/AIImportServiceModal";

export const OPERATION_SERVICE_LABELS: Record<string, string> = {
  flight: "Passagem aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de veículo",
  transfer: "Transfer",
  attraction: "Ingressos / Atrações",
  insurance: "Seguro viagem",
  cruise: "Cruzeiro",
  train: "Trem",
  other: "Outros",
};

export function serviceTypeLabel(type?: string | null) {
  return OPERATION_SERVICE_LABELS[type || "other"] || "Outros";
}

const firstString = (...vals: any[]) =>
  vals.find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;

const firstDate = (...vals: any[]) => {
  const v = vals.find((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x));
  return v ? (v as string).slice(0, 10) : null;
};

export interface MappedOperationService {
  service_type: string;
  name: string;
  supplier: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number;
}

/** Normalizes a quote service (or AI import result) into operational service fields. */
export function mapServiceDataToOperationService(
  serviceType: string,
  data: Record<string, any> = {},
  fallbackAmount = 0,
): MappedOperationService {
  const type = serviceType || "other";
  let name = "";
  let supplier: string | undefined;
  let destination: string | undefined;

  switch (type) {
    case "flight":
      name = firstString(data.flight_label, data.description) ||
        `${firstString(data.origin_city, data.origin) || "?"} → ${firstString(data.destination_city, data.destination) || "?"}`;
      supplier = firstString(data.airline, data.airline_name, data.company);
      destination = firstString(data.destination_city, data.destination);
      break;
    case "hotel":
      name = firstString(data.hotel_name, data.name) || "Hospedagem";
      supplier = firstString(data.supplier, data.operator, data.hotel_chain);
      destination = firstString(data.city, data.destination, data.location);
      break;
    case "transfer":
      name = firstString(data.description) ||
        `${firstString(data.origin_location, data.origin) || "?"} → ${firstString(data.destination_location, data.destination) || "?"}`;
      supplier = firstString(data.supplier, data.company, data.provider);
      destination = firstString(data.destination_location, data.destination, data.city);
      break;
    case "car_rental":
      name = firstString(data.car_category, data.vehicle_category, data.description) || "Locação de veículo";
      supplier = firstString(data.rental_company, data.supplier, data.company);
      destination = firstString(data.pickup_location, data.city, data.destination);
      break;
    case "attraction":
      name = firstString(data.name, data.attraction_name, data.description) || "Ingressos / Atrações";
      supplier = firstString(data.supplier, data.provider, data.operator);
      destination = firstString(data.city, data.location, data.destination);
      break;
    case "insurance":
      name = firstString(data.plan_name, data.plan, data.description) || "Seguro viagem";
      supplier = firstString(data.provider, data.insurer, data.supplier, data.company);
      destination = firstString(data.destination, data.coverage_area);
      break;
    case "cruise":
      name = firstString(data.ship_name, data.cruise_name, data.description) || "Cruzeiro";
      supplier = firstString(data.cruise_line, data.company, data.supplier);
      destination = firstString(data.destination, data.region, data.embark_port);
      break;
    case "train":
      name = firstString(data.description) ||
        `${firstString(data.origin_city, data.origin) || "?"} → ${firstString(data.destination_city, data.destination) || "?"}`;
      supplier = firstString(data.company, data.operator, data.supplier);
      destination = firstString(data.destination_city, data.destination);
      break;
    default:
      name = firstString(data.service_name, data.name, data.title, data.description) || "Serviço";
      supplier = firstString(data.supplier, data.provider, data.company);
      destination = firstString(data.destination, data.city, data.location);
  }

  const amountRaw = [data.amount, data.total_amount, data.price, fallbackAmount].find(
    (v) => typeof v === "number" && !Number.isNaN(v),
  );

  return {
    service_type: type,
    name: name.trim() || serviceTypeLabel(type),
    supplier: supplier || null,
    destination: destination || null,
    start_date: firstDate(data.start_date, data.check_in, data.checkin_date, data.departure_date, data.pickup_date, data.date, data.embark_date),
    end_date: firstDate(data.end_date, data.check_out, data.checkout_date, data.return_date, data.dropoff_date, data.disembark_date),
    amount: Number(amountRaw ?? 0) || 0,
  };
}

export type { AIImportServiceType };
