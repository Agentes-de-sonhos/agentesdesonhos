import {
  Plane,
  Hotel,
  Car,
  Bus,
  Ticket,
  Shield,
  Ship,
  TrainFront,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { TripService, TripServiceType } from "@/types/trip";

/**
 * Per-category presentation config used by the Carteira Digital category
 * overlay (summary + compact cards). Visual layout is the same for every
 * category — only labels, icons and which fields are surfaced change.
 */

export interface CompactFields {
  title: string;
  /** Linha secundária: produto, modalidade, tipo de quarto/ingresso… */
  secondary?: string;
  /** Quantidade de pessoas/passageiros/hóspedes, já formatada. */
  quantity?: string;
  /** Texto cru do status do serviço (não normalizado). */
  rawStatus?: string;
}

export interface CategoryConfig {
  singular: string;
  plural: string;
  summaryTitle: string; // "Seus ingressos", "Suas hospedagens"…
  countWord: (n: number) => string; // "10 ingressos cadastrados"
  seeAllLabel: string; // "Ver todos os ingressos" / "Ver todas as hospedagens"
  icon: LucideIcon;
  /** Cor pastel do fallback da miniatura (tom suave por categoria). */
  thumbBg: string;
  thumbIconColor: string;
  /** Extrai os campos do card compacto a partir do serviço. */
  getCompactFields: (s: TripService) => CompactFields;
}

const labelOr = (v: any, fallback = "") =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const peopleLabel = (n: number, singular: string, plural: string) =>
  n > 0 ? `${n} ${n === 1 ? singular : plural}` : "";

const ATTRACTION_TYPE: Record<string, string> = {
  parque: "Parque",
  show: "Show",
  passeio: "Passeio",
  museu: "Museu",
  tour: "Tour",
  evento: "Evento",
  experiencia: "Experiência",
};

const ROOM_TYPE: Record<string, string> = {
  standard: "Standard",
  superior: "Superior",
  deluxe: "Deluxe",
  suite: "Suíte",
  suite_junior: "Suíte Júnior",
  presidencial: "Presidencial",
  apartamento: "Apartamento",
  villa: "Villa",
  bangalo: "Bangalô",
};

const TRANSFER_MODE: Record<string, string> = {
  privativo: "Transfer privativo",
  compartilhado: "Transfer compartilhado",
  shuttle: "Shuttle",
};

const OTHER_TYPE: Record<string, string> = {
  restaurante: "Restaurante",
  guia_turistico: "Guia turístico",
  chip_internet: "Chip / Internet",
  experiencia: "Experiência",
  evento: "Evento",
  spa_wellness: "Spa & Wellness",
  servico_vip: "Serviço VIP",
  concierge: "Concierge",
  personalizado: "Personalizado",
};

const COVERAGE_TYPE: Record<string, string> = {
  internacional: "Cobertura internacional",
  nacional: "Cobertura nacional",
  schengen: "Cobertura Schengen",
  global: "Cobertura global",
};

export const CATEGORY_CONFIG: Record<TripServiceType, CategoryConfig> = {
  flight: {
    singular: "passagem",
    plural: "passagens",
    summaryTitle: "Suas passagens",
    countWord: (n) => `${n} ${n === 1 ? "passagem cadastrada" : "passagens cadastradas"}`,
    icon: Plane,
    thumbBg: "bg-sky-50",
    thumbIconColor: "text-sky-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const origin = labelOr(d.origin_city);
      const dest = labelOr(d.destination_city);
      const pax = Array.isArray(d.passengers) ? d.passengers.length : 0;
      return {
        title: origin && dest ? `${origin} → ${dest}` : origin || dest || "Voo",
        secondary: labelOr(d.main_airline || d.airline),
        quantity: peopleLabel(pax, "passageiro", "passageiros"),
        rawStatus: d.flight_status,
      };
    },
  },
  hotel: {
    singular: "hospedagem",
    plural: "hospedagens",
    summaryTitle: "Suas hospedagens",
    countWord: (n) => `${n} ${n === 1 ? "hospedagem cadastrada" : "hospedagens cadastradas"}`,
    icon: Hotel,
    thumbBg: "bg-violet-50",
    thumbIconColor: "text-violet-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const guests = Array.isArray(d.guests) ? d.guests.length : 0;
      const guestCount = guests || Number(d.guest_count) || 0;
      return {
        title: labelOr(d.hotel_name, "Hospedagem"),
        secondary: labelOr(ROOM_TYPE[d.room_type] || d.room_type),
        quantity: peopleLabel(guestCount, "hóspede", "hóspedes"),
        rawStatus: d.reservation_status,
      };
    },
  },
  car_rental: {
    singular: "locação",
    plural: "locações",
    summaryTitle: "Suas locações de veículo",
    countWord: (n) => `${n} ${n === 1 ? "locação cadastrada" : "locações cadastradas"}`,
    icon: Car,
    thumbBg: "bg-amber-50",
    thumbIconColor: "text-amber-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      return {
        title: labelOr(d.car_model || d.car_type, "Locação de veículo"),
        secondary: labelOr(d.rental_company || d.pickup_city || d.pickup_location),
        quantity: d.passenger_capacity ? `${d.passenger_capacity} passageiros` : "",
        rawStatus: d.reservation_status,
      };
    },
  },
  transfer: {
    singular: "transfer",
    plural: "transfers",
    summaryTitle: "Seus transfers",
    countWord: (n) => `${n} ${n === 1 ? "transfer cadastrado" : "transfers cadastrados"}`,
    icon: Bus,
    thumbBg: "bg-orange-50",
    thumbIconColor: "text-orange-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const origin = labelOr(d.origin_location || d.pickup_address);
      const dest = labelOr(d.destination_location || d.destination_address);
      const pax = Array.isArray(d.passengers) ? d.passengers.length : 0;
      const paxCount =
        pax || (Number(d.adults_count || 0) + Number(d.children_count || 0));
      const route = origin && dest ? `${origin} → ${dest}` : origin || dest;
      return {
        title: route || labelOr(d.company_name, "Transfer"),
        secondary: labelOr(TRANSFER_MODE[d.transfer_mode] || d.transfer_mode),
        quantity: peopleLabel(paxCount, "passageiro", "passageiros"),
        rawStatus: d.transfer_status,
      };
    },
  },
  attraction: {
    singular: "ingresso",
    plural: "ingressos",
    summaryTitle: "Seus ingressos",
    countWord: (n) => `${n} ${n === 1 ? "ingresso cadastrado" : "ingressos cadastrados"}`,
    icon: Ticket,
    thumbBg: "bg-indigo-50",
    thumbIconColor: "text-indigo-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const qty = Number(d.quantity) || (Array.isArray(d.passengers) ? d.passengers.length : 0);
      return {
        title: labelOr(d.name, "Ingresso"),
        secondary: labelOr(ATTRACTION_TYPE[d.attraction_type] || d.attraction_type),
        quantity: peopleLabel(qty, "pessoa", "pessoas"),
        rawStatus: d.status,
      };
    },
  },
  insurance: {
    singular: "seguro",
    plural: "seguros",
    summaryTitle: "Seus seguros",
    countWord: (n) => `${n} ${n === 1 ? "seguro cadastrado" : "seguros cadastrados"}`,
    icon: Shield,
    thumbBg: "bg-emerald-50",
    thumbIconColor: "text-emerald-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const insured = Array.isArray(d.insured_persons) ? d.insured_persons.length : 0;
      return {
        title: labelOr(d.plan_name || d.provider, "Seguro Viagem"),
        secondary: labelOr(COVERAGE_TYPE[d.coverage_type] || d.coverage_type),
        quantity: peopleLabel(insured, "segurado", "segurados"),
        rawStatus: d.status,
      };
    },
  },
  cruise: {
    singular: "cruzeiro",
    plural: "cruzeiros",
    summaryTitle: "Seus cruzeiros",
    countWord: (n) => `${n} ${n === 1 ? "cruzeiro cadastrado" : "cruzeiros cadastrados"}`,
    icon: Ship,
    thumbBg: "bg-cyan-50",
    thumbIconColor: "text-cyan-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const pax = Array.isArray(d.passengers) ? d.passengers.length : 0;
      return {
        title: labelOr(d.ship_name || d.cruise_company, "Cruzeiro"),
        secondary: labelOr(d.cabin_type || d.route),
        quantity: peopleLabel(pax, "hóspede", "hóspedes"),
        rawStatus: d.checkin_status,
      };
    },
  },
  train: {
    singular: "trecho de trem",
    plural: "trechos de trem",
    summaryTitle: "Seus trens",
    countWord: (n) => `${n} ${n === 1 ? "trecho cadastrado" : "trechos cadastrados"}`,
    icon: TrainFront,
    thumbBg: "bg-rose-50",
    thumbIconColor: "text-rose-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const origin = labelOr(d.origin_city);
      const dest = labelOr(d.destination_city);
      const pax = Array.isArray(d.passengers) ? d.passengers.length : 0;
      return {
        title: origin && dest ? `${origin} → ${dest}` : origin || dest || "Trem",
        secondary: labelOr(d.train_company),
        quantity: peopleLabel(pax, "passageiro", "passageiros"),
      };
    },
  },
  other: {
    singular: "serviço",
    plural: "serviços",
    summaryTitle: "Outros serviços",
    countWord: (n) => `${n} ${n === 1 ? "serviço cadastrado" : "serviços cadastrados"}`,
    icon: FileText,
    thumbBg: "bg-slate-100",
    thumbIconColor: "text-slate-600",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const typeLabel = OTHER_TYPE[d.other_service_type] || d.custom_type_name;
      return {
        title: labelOr(d.service_name, "Serviço"),
        secondary: labelOr(typeLabel),
        rawStatus: d.status,
      };
    },
  },
};

/** Cor + label do status, ou null se status vazio/desconhecido. */
export function resolveStatusBadge(rawStatus?: string): {
  label: string;
  className: string;
} | null {
  if (!rawStatus || !rawStatus.trim()) return null;
  const key = rawStatus.toLowerCase().trim();
  const GREEN = "bg-emerald-50 text-emerald-700 border-emerald-200";
  const AMBER = "bg-amber-50 text-amber-700 border-amber-200";
  const BLUE = "bg-sky-50 text-sky-700 border-sky-200";
  const RED = "bg-rose-50 text-rose-700 border-rose-200";
  const map: Record<string, { label: string; className: string }> = {
    confirmado: { label: "Confirmado", className: GREEN },
    confirmada: { label: "Confirmada", className: GREEN },
    emitido: { label: "Emitido", className: GREEN },
    emitida: { label: "Emitida", className: GREEN },
    ativo: { label: "Ativo", className: GREEN },
    realizado: { label: "Realizado", className: GREEN },
    utilizado: { label: "Utilizado", className: GREEN },
    pendente: { label: "Pendente", className: AMBER },
    pre_reserva: { label: "Pré-reserva", className: AMBER },
    agendado: { label: "Agendado", className: AMBER },
    a_retirar: { label: "A retirar", className: AMBER },
    a_confirmar: { label: "A confirmar", className: BLUE },
    reservado: { label: "Reservado", className: BLUE },
    flexivel: { label: "Flexível", className: BLUE },
    opcional: { label: "Opcional", className: BLUE },
    futuro: { label: "Futuro", className: BLUE },
    cancelado: { label: "Cancelado", className: RED },
    cancelada: { label: "Cancelada", className: RED },
    expirado: { label: "Expirado", className: RED },
  };
  return map[key] || { label: rawStatus, className: BLUE };
}

/** Imagem personalizada do serviço (primeira disponível) ou null. */
export function getServiceThumbnail(s: TripService): string | null {
  if (s.image_url) return s.image_url;
  if (Array.isArray(s.image_urls) && s.image_urls.length > 0) return s.image_urls[0];
  return null;
}

/** Nome curto usado no item do resumo (1ª linha). */
export function getServiceShortName(s: TripService): string {
  const cfg = CATEGORY_CONFIG[s.service_type];
  const compact = cfg.getCompactFields(s);
  return compact.title || cfg.singular;
}

export interface AttachmentLike {
  url: string;
  name: string;
}

/** Junta voucher_url + attachments numa lista única. */
export function collectAttachments(s: TripService): AttachmentLike[] {
  const out: AttachmentLike[] = [];
  if (s.voucher_url) {
    out.push({ url: s.voucher_url, name: s.voucher_name || "Voucher" });
  }
  if (Array.isArray(s.attachments)) {
    for (const a of s.attachments) {
      if (a && a.url) out.push({ url: a.url, name: a.name || "Anexo" });
    }
  }
  return out;
}

/** Verifica se o serviço tem dados adicionais (não exibidos no card compacto). */
export function hasAdditionalDetails(s: TripService): boolean {
  if (collectAttachments(s).length > 0) return true;
  const compact = CATEGORY_CONFIG[s.service_type].getCompactFields(s);
  const compactBlobs = new Set(
    [compact.title, compact.secondary, compact.quantity]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase().trim()),
  );
  const visit = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") {
      const t = val.trim();
      if (!t) return false;
      if (compactBlobs.has(t.toLowerCase())) return false;
      return true;
    }
    if (typeof val === "number") return val !== 0;
    if (typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.some(visit);
    if (typeof val === "object") return Object.values(val).some(visit);
    return false;
  };
  return visit(s.service_data);
}