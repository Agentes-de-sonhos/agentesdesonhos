/**
 * Resumo compacto e padronizado de um serviço do orçamento, em linguagem de
 * cliente. Fonte ÚNICA de apresentação para: card de decisão do wizard,
 * "Suas escolhas", revisão do wizard, pop-up final e tela de sucesso.
 * Puro: nada de I/O, nada de React.
 *
 * Regra central: o título é SEMPRE o nome real do próprio serviço.
 * Etiquetas comerciais (option_label), regime (meal_plan), tipo de quarto,
 * vantagens, estrelas e observações NUNCA substituem o nome real.
 */
import type { QuoteService, ServiceType } from "@/types/quote";
import { translateQuote, type QuoteTranslator } from "@/i18n/publicMaterials/quote";
import { pluralize, DEFAULT_PUBLIC_LOCALE, type PublicLocale } from "@/i18n/publicMaterials/locale";

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

/** Limite de caracteres da descrição curta exibida nos cards. */
export const SHORT_DESCRIPTION_LIMIT = 180;

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
};

const first = (...values: unknown[]): string | null => {
  for (const v of values) {
    const s = str(v);
    if (s) return s;
  }
  return null;
};

/** Datas "YYYY-MM-DD" (ou ISO) → "dd/mm/aaaa" sem deslocamento de fuso. */
function fmtDate(value?: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return raw;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return null;
  const y = Number(iso[1]);
  const m = Number(iso[2]);
  const d = Number(iso[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** "HH:MM(:SS)" → "HH:MM". */
function fmtTime(value?: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function dateWithTime(date?: unknown, time?: unknown): string | null {
  const d = fmtDate(date);
  if (!d) return null;
  const t = fmtTime(time);
  return t ? `${d} às ${t}` : d;
}

/** Normaliza rótulos técnicos ("suv", "half_board") para leitura humana. */
function humanize(value: string): string {
  const clean = value.replace(/_/g, " ").trim();
  if (clean.length <= 3) return clean.toUpperCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function localizedTypeLabel(type: ServiceType | string, t: QuoteTranslator): string {
  switch (type) {
    case "flight": return t("digestFlight");
    case "hotel": return t("digestHotel");
    case "car_rental": return t("digestCarRental");
    case "transfer": return t("digestTransfer");
    case "attraction": return t("digestAttraction");
    case "insurance": return t("digestInsurance");
    case "cruise": return t("digestCruise");
    case "rail_transport": return t("digestRail");
    case "circuit": return t("digestCircuit");
    case "other": return t("digestOther");
    default: return t("digestDefault");
  }
}

export function serviceDigestTypeLabel(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): string {
  return localizedTypeLabel(service.service_type as ServiceType, translateQuote(locale));
}

/**
 * Nome real do serviço, resolvido por tipo. Cada registro lê apenas o seu
 * próprio `service_data` — nunca herda título de outra opção.
 */
export function serviceDigestTitle(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): string {
  const data = (service.service_data as any) || {};
  const typeLabel = serviceDigestTypeLabel(service, locale);
  let real: string | null = null;

  switch (service.service_type) {
    case "hotel":
      // hotel_name tem prioridade absoluta sobre qualquer etiqueta comercial.
      real = first(data.hotel_name, data.name, data.custom_title);
      break;
    case "attraction":
      real = first(data.product_name, data.name, data.attraction_name, data.custom_title);
      break;
    case "cruise":
      real = first(data.ship_name, data.name, data.cruise_name, data.custom_title);
      break;
    case "circuit":
      real = first(data.circuit_name, data.name, data.custom_title);
      break;
    case "insurance":
      real = first(data.product_name, data.provider, data.company_name, data.name, data.custom_title);
      break;
    case "car_rental": {
      // Nome/modelo real primeiro; depois a categoria ("Locação de SUV");
      // fornecedor apenas quando não há nome/modelo nem categoria.
      real = first(data.car_model, data.vehicle_model, data.product_name, data.name);
      if (!real) {
        const category = first(data.car_type, data.car_category, data.vehicle_category);
        if (category) real = `Locação de ${humanize(category)}`;
      }
      if (!real) real = first(data.rental_company, data.provider, data.company_name);
      break;
    }
    case "flight": {
      real = first(data.airline, data.product_name, data.name, data.custom_title);
      if (!real) {
        const route = [str(data.origin_city), str(data.destination_city)].filter(Boolean);
        if (route.length === 2) real = `${route[0]} → ${route[1]}`;
      }
      break;
    }
    case "transfer": {
      real = first(data.provider, data.company_name, data.product_name, data.name, data.custom_title);
      if (!real) {
        const place = first(data.location, data.city);
        real = place ? `Transfer em ${place}` : null;
      }
      break;
    }
    case "rail_transport": {
      real = first(data.operator, data.company_name, data.provider, data.product_name, data.name);
      if (!real) {
        const route = [str(data.origin_city), str(data.destination_city)].filter(Boolean);
        if (route.length === 2) real = `${route[0]} → ${route[1]}`;
      }
      break;
    }
    default:
      real = first(data.custom_title, data.company_name, data.name, data.product_name, data.provider);
      break;
  }

  if (real) return real;
  // Último fallback absoluto: etiqueta comercial, só quando não há nome real.
  return first(service.option_label) || typeLabel;
}

/** Cidade/trajeto/local do serviço. */
export function serviceDigestLocation(service: QuoteService): string | null {
  const data = (service.service_data as any) || {};
  switch (service.service_type) {
    case "hotel":
      return first(data.city, data.location);
    case "car_rental": {
      const pickup = first(data.pickup_location);
      const dropoff = first(data.dropoff_location);
      if (pickup && dropoff && pickup !== dropoff) return `${pickup} → ${dropoff}`;
      return pickup || dropoff || first(data.city);
    }
    case "flight":
    case "rail_transport": {
      const route = [str(data.origin_city), str(data.destination_city)].filter(Boolean);
      if (route.length === 2) return `${route[0]} → ${route[1]}`;
      return route[0] || first(data.route, data.city);
    }
    case "cruise":
      return first(data.route, data.departure_port, data.city);
    case "transfer":
      return first(data.location, data.city);
    default:
      return first(data.city, data.location, data.route, data.destination);
  }
}

export interface ServiceDigestLine {
  label: string;
  value: string;
}

/** Linhas de data/período, por tipo de serviço. Nunca omite a segunda data. */
export function serviceDigestDateLines(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): ServiceDigestLine[] {
  const data = (service.service_data as any) || {};
  const t = translateQuote(locale);
  const lines: ServiceDigestLine[] = [];
  const push = (label: string, value: string | null) => {
    if (value) lines.push({ label, value });
  };

  switch (service.service_type) {
    case "flight":
      push(t("ida"), fmtDate(data.departure_date));
      if (!data.is_one_way) push(t("volta"), fmtDate(data.return_date));
      break;
    case "hotel":
      push(t("checkIn"), fmtDate(data.check_in));
      push(t("checkOut"), fmtDate(data.check_out));
      break;
    case "car_rental":
      push(t("retirada"), dateWithTime(data.pickup_date, data.pickup_time));
      push(t("devolucao"), dateWithTime(data.dropoff_date, data.dropoff_time));
      break;
    case "transfer":
      push(
        t("chegada"),
        dateWithTime(data.arrival_date || data.date, data.arrival_time || data.time),
      );
      push(
        t("retorno"),
        dateWithTime(data.departure_date || data.return_date, data.departure_time || data.return_time),
      );
      break;
    case "attraction":
      push(t("data"), fmtDate(data.date || data.usage_date));
      break;
    case "insurance":
      push(t("start"), fmtDate(data.start_date));
      push(t("termino"), fmtDate(data.end_date));
      break;
    case "cruise":
      push(t("embarque"), fmtDate(data.start_date));
      push(t("desembarque"), fmtDate(data.end_date));
      break;
    case "rail_transport":
      push(t("partida"), dateWithTime(data.travel_date || data.departure_date, data.departure_time));
      push(t("retorno"), dateWithTime(data.return_date, data.return_time));
      break;
    default:
      push(t("start"), fmtDate(data.start_date));
      push(t("termino"), fmtDate(data.end_date));
      if (lines.length === 0) push(t("data"), fmtDate(data.date));
      break;
  }
  return lines;
}

const positive = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Quantidade relevante ao tipo (nunca inventada). */
export function serviceDigestQuantity(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): string | null {
  const data = (service.service_data as any) || {};
  const t = translateQuote(locale);
  const plural = (n: number, oneKey: keyof ReturnType<typeof translateQuote> extends never ? never : any, otherKey: any) =>
    `${n} ${pluralize(locale, n, { one: t(oneKey), other: t(otherKey) })}`;
  switch (service.service_type) {
    case "attraction": {
      const q = positive(data.quantity);
      return q ? plural(q, "ingressoOne", "ingressoOther") : null;
    }
    case "hotel": {
      const rooms = Array.isArray(data.rooms) ? data.rooms : [];
      const roomCount = rooms.length > 0
        ? rooms.reduce((acc: number, r: any) => acc + (positive(r?.quantity) || 1), 0)
        : positive(data.rooms_quantity) || positive(data.quantity);
      const guests = positive(data.guests) || positive(data.total_passengers);
      const parts: string[] = [];
      if (roomCount) parts.push(plural(roomCount, "quartoOne", "quartoOther"));
      if (guests) parts.push(plural(guests, "hospedeOne", "hospedeOther"));
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "car_rental": {
      const units = positive(data.quantity) || positive(data.vehicles);
      return units ? plural(units, "veiculoOne", "veiculoOther") : null;
    }
    default: {
      const pax = positive(data.passengers) || positive(data.total_passengers);
      if (pax) return plural(pax, "passageiroOne", "passageiroOther");
      const units = positive(data.quantity);
      return units ? plural(units, "unidadeOne", "unidadeOther") : null;
    }
  }
}

/** Descrição curta e normalizada (sem HTML, sem texto contratual longo). */
export function serviceDigestShortDescription(
  service: QuoteService,
  limit = SHORT_DESCRIPTION_LIMIT,
): string | null {
  const data = (service.service_data as any) || {};
  const raw = first(service.description, data.description, data.notes);
  if (!raw) return null;
  const clean = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Fotos do serviço, na ordem cadastrada. */
export function serviceDigestImages(service: QuoteService): string[] {
  const list = Array.isArray(service.image_urls) ? service.image_urls.filter(Boolean) : [];
  if (list.length > 0) return list;
  return service.image_url ? [service.image_url] : [];
}

export interface ServiceCompactDigest {
  typeLabel: string;
  title: string;
  location: string | null;
  dateLines: ServiceDigestLine[];
  quantity: string | null;
  shortDescription: string | null;
  images: string[];
}

/** Modelo compacto compartilhado por todas as telas do fluxo de reserva. */
export function serviceCompactDigest(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): ServiceCompactDigest {
  return {
    typeLabel: serviceDigestTypeLabel(service, locale),
    title: serviceDigestTitle(service, locale),
    location: serviceDigestLocation(service),
    dateLines: serviceDigestDateLines(service, locale),
    quantity: serviceDigestQuantity(service, locale),
    shortDescription: serviceDigestShortDescription(service),
    images: serviceDigestImages(service),
  };
}

/** Linha única com datas, para resumos muito compactos. */
export function serviceDigestDateSummary(service: QuoteService): string | null {
  const lines = serviceDigestDateLines(service);
  if (lines.length === 0) return null;
  return lines.map((l) => `${l.label}: ${l.value}`).join(" · ");
}

/* ------------------------------------------------------------------ vitrine */

/**
 * Destaques curtos e comparáveis do serviço, usados nos cards da vitrine
 * pública (chips). Usa somente dados já cadastrados — nunca duplica cadastro
 * e nunca substitui o nome real do serviço.
 */
export function serviceDigestHighlights(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): string[] {
  const t = translateQuote(locale);
  const d = (service.service_data || {}) as any;
  const out: string[] = [];
  const push = (value: unknown) => {
    const clean = str(value);
    if (clean && !out.includes(clean)) out.push(clean);
  };

  switch (service.service_type) {
    case "hotel": {
      push(d.meal_plan);
      const rooms = Array.isArray(d.rooms) ? d.rooms : [];
      if (rooms.length > 0) {
        const total = rooms.reduce((acc: number, r: any) => acc + (Number(r?.quantity) || 0), 0);
        if (total > 0) push(`${total} apartamento${total > 1 ? "s" : ""}`);
        const types = Array.from(
          new Set(rooms.map((r: any) => str(r?.room_type)).filter(Boolean) as string[]),
        );
        types.slice(0, 2).forEach(push);
      } else {
        push(d.room_type);
      }
      break;
    }
    case "flight": {
      push(d.airline);
      push(d.baggage);
      if (d.includes_boarding_fee) push(t("taxasIncluidas"));
      break;
    }
    case "transfer": {
      if (d.service_category === "private") push(t("privateType"));
      if (d.service_category === "regular") push(t("regularType"));
      push(d.vehicle_type);
      break;
    }
    case "car_rental": {
      push(d.car_type);
      push(d.rental_company);
      break;
    }
    case "cruise": {
      push(d.cabin_type);
      push(d.ship_name);
      break;
    }
    case "insurance": {
      push(d.plan_name);
      push(d.coverage);
      break;
    }
    case "attraction": {
      push(d.ticket_type);
      break;
    }
    default:
      break;
  }

  const quantity = serviceDigestQuantity(service, locale);
  if (quantity) push(quantity);
  return out.slice(0, 4);
}

export interface ServiceDetailRow {
  label: string;
  value: string;
}

/**
 * Linhas de "Ver detalhes" — mesma informação do card, expandida, sem inventar
 * campos que a agência não preencheu.
 */
export function serviceDigestDetailRows(
  service: QuoteService,
  locale: PublicLocale | string | null = DEFAULT_PUBLIC_LOCALE,
): ServiceDetailRow[] {
  const t = translateQuote(locale);
  const rows: ServiceDetailRow[] = [];
  const location = serviceDigestLocation(service);
  if (location) rows.push({ label: t("local"), value: location });
  for (const line of serviceDigestDateLines(service, locale)) {
    rows.push({ label: line.label, value: line.value });
  }
  const highlights = serviceDigestHighlights(service, locale);
  if (highlights.length > 0) rows.push({ label: t("destaques"), value: highlights.join(" · ") });
  return rows;
}
