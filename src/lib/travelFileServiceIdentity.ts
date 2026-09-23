import type { TravelFileService } from "@/types/travelFile";
import { OPERATION_SERVICE_LABELS, serviceTypeLabel } from "@/lib/operationServiceMap";
import { resolveAirlineDisplay } from "@/lib/airlines";

/**
 * Identidade do serviço na Central de Reservas.
 *
 * Espelha as funções `travel_file_service_display_name` /
 * `travel_file_service_supplier_name` do banco (migration 0026) para que
 * registros antigos — materializados antes da correção — também apareçam com
 * o nome real do produto, e nunca com a etiqueta da alternativa do orçamento
 * ("Melhor custo-benefício") nem com o próprio tipo ("hotel").
 */

type Snapshot = Record<string, unknown>;

const asRecord = (value: unknown): Snapshot =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Snapshot) : {};

const text = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pick = (source: Snapshot, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return null;
};

/** Dados estruturados do serviço dentro do snapshot da solicitação. */
export function serviceSnapshotData(service: Pick<TravelFileService, "snapshot">): Snapshot {
  const snapshot = asRecord(service.snapshot);
  const data = asRecord(snapshot.service_data);
  return Object.keys(data).length > 0 ? data : snapshot;
}

/** Etiqueta da alternativa escolhida no orçamento (badge secundária). */
export function serviceOptionLabel(service: Pick<TravelFileService, "snapshot">): string | null {
  return pick(asRecord(service.snapshot), "option_label");
}

/** Nome real do produto/estabelecimento/companhia, sem inventar dado nenhum. */
export function resolveServiceProductName(
  service: Pick<TravelFileService, "service_type" | "product_name" | "snapshot">,
): string {
  const type = (service.service_type || "other").toLowerCase();
  const data = serviceSnapshotData(service);
  const label = serviceTypeLabel(type);

  let structured: string | null = null;
  if (type === "flight") {
    const airline = pick(data, "airline", "airline_name", "company");
    structured = airline ? resolveAirlineDisplay(airline) : null;
  } else if (type === "hotel") {
    structured = pick(data, "hotel_name", "name", "property_name");
  } else if (type === "car_rental") {
    structured = pick(data, "rental_company", "company", "vehicle_category", "car_category");
  } else if (type === "insurance") {
    structured = pick(data, "plan_name", "insurer", "provider");
  } else if (type === "cruise") {
    structured = pick(data, "ship_name", "cruise_line");
  } else {
    structured = pick(
      data,
      "name",
      "establishment",
      "place_name",
      "attraction_name",
      "product_name",
      "title",
      "service_name",
    );
  }
  if (structured) return structured;

  const stored = text(service.product_name);
  const option = serviceOptionLabel(service);
  const known = Object.keys(OPERATION_SERVICE_LABELS);
  if (
    stored &&
    stored.toLowerCase() !== (option || "").toLowerCase() &&
    stored.toLowerCase() !== type &&
    stored.toLowerCase() !== label.toLowerCase() &&
    !known.includes(stored.toLowerCase())
  ) {
    return stored;
  }
  return label;
}

/**
 * Título do card: tipo amigável + nome real.
 * Ex.: "Passagem aérea — LATAM Airlines", "Hotel — Hôtel Belgrand".
 */
export function travelFileServiceTitle(
  service: Pick<TravelFileService, "service_type" | "product_name" | "snapshot">,
): string {
  const label = serviceTypeLabel(service.service_type);
  const name = resolveServiceProductName(service);
  return name && name !== label ? `${label} — ${name}` : label;
}

/** Fornecedor registrado no orçamento (usado só quando o serviço não tem um). */
export function resolveSnapshotSupplier(
  service: Pick<TravelFileService, "snapshot">,
): string | null {
  const data = serviceSnapshotData(service);
  return pick(
    data,
    "supplier_name",
    "supplier",
    "operator",
    "consolidator",
    "hotel_chain",
    "rental_company",
    "cruise_line",
    "insurer",
    "provider",
  );
}

/** Fornecedor exibido: o gravado no serviço e, na falta dele, o do orçamento. */
export function displayServiceSupplier(
  service: Pick<TravelFileService, "supplier_name" | "snapshot">,
): string | null {
  return text(service.supplier_name) || resolveSnapshotSupplier(service);
}
