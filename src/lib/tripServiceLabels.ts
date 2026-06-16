import type { TripService, TripServiceType } from "@/types/trip";

export const SERVICE_ICONS: Record<TripServiceType, string> = {
  flight: "✈️",
  hotel: "🏨",
  car_rental: "🚗",
  transfer: "🚐",
  attraction: "🎫",
  insurance: "🛡️",
  cruise: "🚢",
  train: "🚂",
  other: "📋",
};

export const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos / Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  train: "Trem",
  other: "Outros",
};

/** Short chip label shown next to an activity, e.g. "Ver passagem". */
export const SERVICE_CHIP_LABELS: Record<TripServiceType, string> = {
  flight: "Ver passagem",
  hotel: "Ver hospedagem",
  car_rental: "Ver locação",
  transfer: "Ver transfer",
  attraction: "Ver ingresso",
  insurance: "Ver seguro",
  cruise: "Ver cruzeiro",
  train: "Ver trem",
  other: "Ver serviço",
};

/** Human-readable summary of a service, used inside the combobox options. */
export function getServiceSummary(service: TripService): string {
  const data = (service.service_data ?? {}) as any;
  switch (service.service_type) {
    case "flight":
      return `${data.origin_city || "?"} → ${data.destination_city || "?"}`;
    case "hotel":
      return data.hotel_name || "Hotel";
    case "transfer":
      return `${data.origin_location || "?"} → ${data.destination_location || "?"}`;
    case "car_rental":
      return data.rental_company || "Locação";
    case "attraction":
      return data.name || "Atração";
    case "insurance":
      return data.provider || "Seguro";
    case "cruise":
      return data.ship_name || "Cruzeiro";
    case "train":
      return `${data.origin_city || "?"} → ${data.destination_city || "?"}`;
    default:
      return data.service_name || "Serviço";
  }
}