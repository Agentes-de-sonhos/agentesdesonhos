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
import { collectServiceDocuments } from "@/lib/serviceDocuments";
import {
  formatFriendlyDate,
  formatFriendlyDateRange,
  formatFriendlyTime,
  joinDetail,
} from "@/lib/friendlyDateRange";

/**
 * Per-category presentation config used by the Carteira Digital category
 * overlay (summary + compact cards). Visual layout is the same for every
 * category — only labels, icons and which fields are surfaced change.
 */

export interface CompactFields {
  /** Identificação principal do serviço (hotel, rota, atração…). */
  title: string;
  /**
   * Linhas essenciais do card recolhido, já formatadas e sem vazios.
   * Máximo de 3 linhas — o passageiro precisa reconhecer o serviço sem expandir.
   */
  details: string[];
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

const MAX_DETAIL_LINES = 3;

const labelOr = (v: any, fallback = "") =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/** Monta a lista de linhas essenciais removendo vazios e duplicatas. */
function buildDetails(lines: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const t = typeof line === "string" ? line.trim() : "";
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_DETAIL_LINES) break;
  }
  return out;
}

/** Rota "Origem → Destino" (sem repetir quando origem = destino). */
function routeLabel(origin?: string | null, dest?: string | null): string | null {
  const a = labelOr(origin);
  const b = labelOr(dest);
  if (a && b) {
    if (a.toLowerCase() === b.toLowerCase()) return a;
    return `${a} → ${b}`;
  }
  return a || b || null;
}

/** "Cidade, Estado" (estado a partir do tipo atual ou de dados legados). */
function cityRegionLabel(d: any): string | null {
  const city = labelOr(d.city || d.city_name);
  const region = labelOr(d.state || d.state_name || d.region || d.province);
  if (city && region) return `${city}, ${region}`;
  if (city) return city;
  return null;
}

export const CATEGORY_CONFIG: Record<TripServiceType, CategoryConfig> = {
  flight: {
    singular: "passagem",
    plural: "passagens",
    summaryTitle: "Suas passagens",
    countWord: (n) => `${n} ${n === 1 ? "passagem cadastrada" : "passagens cadastradas"}`,
    seeAllLabel: "Ver todas as passagens",
    icon: Plane,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const segments = Array.isArray(d.segments) ? d.segments.filter(Boolean) : [];
      const first = segments[0];
      const last = segments.length > 0 ? segments[segments.length - 1] : undefined;

      const origin = labelOr(d.origin_city) || labelOr(first?.origin_city || first?.origin_airport);
      const dest =
        labelOr(d.destination_city) ||
        labelOr(last?.destination_city || last?.destination_airport);

      const period = formatFriendlyDateRange(
        first?.flight_date || d.departure_date,
        last && last !== first ? last.flight_date : d.return_date,
      );

      const departure = formatFriendlyTime(first?.departure_time);
      const arrival = formatFriendlyTime(last?.arrival_time);
      const times =
        departure && arrival
          ? `Partida ${departure} · Chegada ${arrival}`
          : departure
            ? `Partida ${departure}`
            : arrival
              ? `Chegada ${arrival}`
              : null;

      return {
        title: routeLabel(origin, dest) || "Voo",
        details: buildDetails([period, times, labelOr(d.main_airline || d.airline) || null]),
        rawStatus: d.flight_status,
      };
    },
  },
  hotel: {
    singular: "hospedagem",
    plural: "hospedagens",
    summaryTitle: "Suas hospedagens",
    countWord: (n) => `${n} ${n === 1 ? "hospedagem cadastrada" : "hospedagens cadastradas"}`,
    seeAllLabel: "Ver todas as hospedagens",
    icon: Hotel,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      // Nunca exibir room_type/categoria do quarto nem quantidade de hóspedes aqui.
      return {
        title: labelOr(d.hotel_name, "Hospedagem"),
        details: buildDetails([
          formatFriendlyDateRange(d.check_in, d.check_out),
          cityRegionLabel(d),
        ]),
        rawStatus: d.reservation_status,
      };
    },
  },
  car_rental: {
    singular: "locação",
    plural: "locações",
    summaryTitle: "Suas locações de veículo",
    countWord: (n) => `${n} ${n === 1 ? "locação cadastrada" : "locações cadastradas"}`,
    seeAllLabel: "Ver todas as locações",
    icon: Car,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const company = labelOr(d.rental_company);
      const car = labelOr(d.car_model || d.car_type);
      const title = joinDetail([company, car], " · ") || "Locação de veículo";

      const pickupPlace = labelOr(d.pickup_city || d.pickup_location || d.pickup_address);
      const dropoffPlace = labelOr(d.dropoff_city || d.dropoff_location || d.dropoff_address);
      const pickupTime = formatFriendlyTime(d.pickup_time);
      const dropoffTime = formatFriendlyTime(d.dropoff_time);

      const sameSpot =
        pickupPlace && dropoffPlace && pickupPlace.toLowerCase() === dropoffPlace.toLowerCase();
      const pickupLabel = joinDetail([pickupPlace, pickupTime], " · ");
      const dropoffLabel = joinDetail([dropoffPlace, dropoffTime], " · ");
      const places = sameSpot
        ? joinDetail(
            [pickupPlace, joinDetail([pickupTime, dropoffTime], " → ")],
            " · ",
          )
        : pickupLabel && dropoffLabel
          ? `${pickupLabel} → ${dropoffLabel}`
          : pickupLabel || dropoffLabel;

      return {
        title,
        details: buildDetails([
          formatFriendlyDateRange(d.pickup_date, d.dropoff_date),
          places,
        ]),
        rawStatus: d.reservation_status,
      };
    },
  },
  transfer: {
    singular: "transfer",
    plural: "transfers",
    summaryTitle: "Seus transfers",
    countWord: (n) => `${n} ${n === 1 ? "transfer cadastrado" : "transfers cadastrados"}`,
    seeAllLabel: "Ver todos os transfers",
    icon: Bus,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const origin = labelOr(d.origin_location || d.pickup_address);
      const dest = labelOr(d.destination_location || d.destination_address);
      const route = routeLabel(origin, dest);
      const title = route || labelOr(d.company_name, "Transfer");

      const dateLine = joinDetail(
        [formatFriendlyDate(d.date), formatFriendlyTime(d.time)],
        " · ",
      );
      const city = labelOr(d.city);
      const cityAddsValue =
        city && !(route || "").toLowerCase().includes(city.toLowerCase()) ? city : null;

      return {
        title,
        details: buildDetails([dateLine, cityAddsValue]),
        rawStatus: d.transfer_status,
      };
    },
  },
  attraction: {
    singular: "ingresso",
    plural: "ingressos",
    summaryTitle: "Seus ingressos",
    countWord: (n) => `${n} ${n === 1 ? "ingresso cadastrado" : "ingressos cadastrados"}`,
    seeAllLabel: "Ver todos os ingressos",
    icon: Ticket,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const dateLine = joinDetail(
        [formatFriendlyDate(d.date), formatFriendlyTime(d.entry_time)],
        " · ",
      );
      const city = cityRegionLabel(d);
      const venue = labelOr(d.venue_name || d.location || d.address);
      const venueAddsValue =
        venue && !(city || "").toLowerCase().includes(venue.toLowerCase()) ? venue : null;
      const placeLine = joinDetail([city, venueAddsValue], " · ");

      return {
        title: labelOr(d.name, "Ingresso"),
        details: buildDetails([dateLine, placeLine]),
        rawStatus: d.status,
      };
    },
  },
  insurance: {
    singular: "seguro",
    plural: "seguros",
    summaryTitle: "Seus seguros",
    countWord: (n) => `${n} ${n === 1 ? "seguro cadastrado" : "seguros cadastrados"}`,
    seeAllLabel: "Ver todos os seguros",
    icon: Shield,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const plan = labelOr(d.plan_name);
      const provider = labelOr(d.provider);
      const title =
        plan && provider && plan.toLowerCase() !== provider.toLowerCase()
          ? `${plan} · ${provider}`
          : plan || provider || "Seguro Viagem";

      // Destino coberto: sem rótulo genérico de cobertura no lugar do destino.
      const destination = labelOr(
        d.destination_covered || d.destination || d.destination_city || d.covered_destination,
      );

      return {
        title,
        details: buildDetails([
          formatFriendlyDateRange(d.start_date, d.end_date),
          destination || null,
        ]),
        rawStatus: d.status,
      };
    },
  },
  cruise: {
    singular: "cruzeiro",
    plural: "cruzeiros",
    summaryTitle: "Seus cruzeiros",
    countWord: (n) => `${n} ${n === 1 ? "cruzeiro cadastrado" : "cruzeiros cadastrados"}`,
    seeAllLabel: "Ver todos os cruzeiros",
    icon: Ship,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const ship = labelOr(d.ship_name);
      const company = labelOr(d.cruise_company);
      const title =
        ship && company && ship.toLowerCase() !== company.toLowerCase()
          ? `${ship} · ${company}`
          : ship || company || "Cruzeiro";

      // Sem cabin_type no card recolhido.
      const ports = routeLabel(d.embarkation_port, d.disembarkation_port);
      const routeLine = labelOr(d.route) || ports;

      return {
        title,
        details: buildDetails([
          formatFriendlyDateRange(d.start_date, d.end_date),
          routeLine,
        ]),
        rawStatus: d.checkin_status,
      };
    },
  },
  train: {
    singular: "trecho de trem",
    plural: "trechos de trem",
    summaryTitle: "Seus trens",
    countWord: (n) => `${n} ${n === 1 ? "trecho cadastrado" : "trechos cadastrados"}`,
    seeAllLabel: "Ver todos os trechos",
    icon: TrainFront,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const departure = formatFriendlyTime(d.departure_time);
      const arrival = formatFriendlyTime(d.arrival_time);
      const times =
        departure && arrival
          ? `${departure} → ${arrival}`
          : departure
            ? `Partida ${departure}`
            : arrival
              ? `Chegada ${arrival}`
              : null;
      const stations = routeLabel(d.origin_station, d.destination_station);

      return {
        title: routeLabel(d.origin_city, d.destination_city) || "Trem",
        details: buildDetails([formatFriendlyDate(d.travel_date), times, stations]),
      };
    },
  },
  other: {
    singular: "serviço",
    plural: "serviços",
    summaryTitle: "Outros serviços",
    countWord: (n) => `${n} ${n === 1 ? "serviço cadastrado" : "serviços cadastrados"}`,
    seeAllLabel: "Ver todos os serviços",
    icon: FileText,
    thumbBg: "bg-[hsl(var(--wallet-brand-soft))]",
    thumbIconColor: "text-[hsl(var(--wallet-brand))]",
    getCompactFields: (s) => {
      const d: any = s.service_data || {};
      const dateLine = joinDetail(
        [formatFriendlyDate(d.date), formatFriendlyTime(d.time)],
        " · ",
      );
      const city = labelOr(d.city);
      const country = labelOr(d.country);
      const place =
        joinDetail([city, city && country ? country : city ? null : country], ", ") ||
        labelOr(d.location_name || d.address) ||
        null;

      return {
        title: labelOr(d.service_name, "Serviço"),
        details: buildDetails([dateLine, place]),
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

/** Quantidade de arquivos do serviço — mesma lista do card expandido. */
export function countServiceFiles(s: TripService): number {
  return collectServiceDocuments(s).length;
}

/** Texto do contador de arquivos: "1 arquivo" / "2 arquivos" / null quando zero. */
export function formatFilesCountLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} ${count === 1 ? "arquivo" : "arquivos"}`;
}

/** Verifica se o serviço tem dados adicionais (não exibidos no card compacto). */
export function hasAdditionalDetails(s: TripService): boolean {
  if (countServiceFiles(s) > 0) return true;
  const compact = CATEGORY_CONFIG[s.service_type].getCompactFields(s);
  const compactText = [compact.title, ...compact.details].join(" · ").toLowerCase();
  const compactBlobs = new Set(
    compactText
      .split(/·|→/)
      .map((part) => part.trim())
      .filter(Boolean),
  );

  /** Um valor cru está "coberto" quando já aparece (cru ou formatado) no resumo. */
  const isCovered = (raw: string): boolean => {
    const t = raw.toLowerCase();
    if (compactBlobs.has(t) || compactText.includes(t)) return true;
    const asDate = formatFriendlyDate(raw);
    if (asDate) {
      if (compactText.includes(asDate.toLowerCase())) return true;
      // Períodos ("17 a 22 de agosto de 2026") cobrem cada data isolada:
      // basta que dia, mês e ano da data crua apareçam no resumo.
      const [day, month, , year] = asDate.split(" de ").join(" ").split(" ");
      const parts = asDate.match(/^(\\d{1,2}) de (.+) de (\\d{4})$/);
      if (parts) {
        const [, d, m, y] = parts;
        if (
          compactText.includes(m.toLowerCase()) &&
          compactText.includes(y) &&
          new RegExp(`(^|[^\\\\d])${d}([^\\\\d]|$)`).test(compactText)
        ) {
          return true;
        }
      }
      void day;
      void month;
      void year;
    }
    const asTime = formatFriendlyTime(raw);
    if (asTime && compactText.includes(asTime.toLowerCase())) return true;
    return false;
  };

  const visit = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") {
      const t = val.trim();
      if (!t) return false;
      return !isCovered(t);
    }
    if (typeof val === "number") return val !== 0;
    if (typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.some(visit);
    if (typeof val === "object") return Object.values(val).some(visit);
    return false;
  };
  return visit(s.service_data);
}
