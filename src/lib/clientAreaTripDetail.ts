/**
 * Área do Cliente White Label — Etapa 4: detalhe da viagem.
 *
 * Este módulo concentra TODA a regra de apresentação do detalhe (serviços,
 * programação cronológica e viajantes). O servidor devolve apenas campos
 * seguros ao passageiro; aqui só rotulamos e ordenamos. Nenhum valor
 * financeiro, custo, comissão, fornecedor ou anotação interna existe neste
 * modelo — e nada aqui é editável (a área é somente leitura).
 */
import { type ClientAreaTrip, parseTripDate } from "./clientAreaTrips";

/** Serviço contratado, como o passageiro pode vê-lo. */
export interface ClientAreaTripService {
  id: string;
  service_type: string | null;
  name: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Confirmado pela agência (emitido/confirmado); nunca status de pagamento. */
  confirmed: boolean;
  /** Campos livres já filtrados no servidor (sem dados financeiros). */
  details: Record<string, unknown> | null;
}

/** Viajante vinculado ao cliente da sessão (somente identificação). */
export interface ClientAreaTraveler {
  id: string;
  name: string | null;
  is_responsible: boolean;
}

export interface ClientAreaTripDetailData extends ClientAreaTrip {
  services?: ClientAreaTripService[];
  travelers?: ClientAreaTraveler[];
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  flight: "Passagem aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de veículo",
  transfer: "Transfer",
  attraction: "Ingressos e atrações",
  insurance: "Seguro viagem",
  cruise: "Cruzeiro",
  train: "Trem",
  tour: "Passeio",
  package: "Pacote",
  other: "Outro serviço",
};

export function serviceTypeLabel(type?: string | null): string {
  if (!type) return SERVICE_TYPE_LABELS.other;
  return SERVICE_TYPE_LABELS[type] ?? SERVICE_TYPE_LABELS.other;
}

export function serviceTitle(service: ClientAreaTripService): string {
  const name = (service.name || "").trim();
  return name || serviceTypeLabel(service.service_type);
}

export function serviceStatusLabel(service: ClientAreaTripService): string {
  return service.confirmed ? "Confirmado" : "Em processamento";
}

/** Rótulos amigáveis dos campos livres mais comuns dos serviços. */
const DETAIL_LABELS: Record<string, string> = {
  origin: "Origem",
  origin_city: "Origem",
  origin_location: "Origem",
  destination: "Destino",
  destination_city: "Destino",
  destination_location: "Destino",
  airline: "Companhia aérea",
  flight_number: "Voo",
  departure_time: "Horário de partida",
  arrival_time: "Horário de chegada",
  departure_date: "Data de partida",
  return_date: "Data de retorno",
  baggage: "Bagagem",
  hotel_name: "Hotel",
  city: "Cidade",
  address: "Endereço",
  check_in: "Check-in",
  check_out: "Check-out",
  nights: "Noites",
  room_type: "Tipo de apartamento",
  meal_plan: "Regime de alimentação",
  category: "Categoria",
  car_category: "Categoria do veículo",
  rental_company: "Locadora",
  pickup_location: "Retirada",
  dropoff_location: "Devolução",
  pickup_date: "Data de retirada",
  dropoff_date: "Data de devolução",
  ship_name: "Navio",
  cabin_type: "Tipo de cabine",
  embark_port: "Porto de embarque",
  disembark_port: "Porto de desembarque",
  plan_name: "Plano",
  coverage: "Cobertura",
  duration: "Duração",
  quantity: "Quantidade",
  description: "Descrição",
  locator: "Localizador",
  reservation_code: "Código da reserva",
  confirmation_code: "Código de confirmação",
  voucher_number: "Número do voucher",
  time: "Horário",
  date: "Data",
};

function humanize(key: string): string {
  const text = key.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}

export function detailLabel(key: string): string {
  return DETAIL_LABELS[key] ?? humanize(key);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valor legível; datas ISO viram formato brasileiro, booleanos viram Sim/Não. */
export function detailValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const m = ISO_DATE.exec(text);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return text;
}

export interface DetailRow {
  key: string;
  label: string;
  value: string;
}

/** Ordem preferida: campos conhecidos primeiro, na sequência do dicionário. */
const PREFERRED = Object.keys(DETAIL_LABELS);

/** Linhas exibíveis de um serviço; ignora vazios, objetos e listas. */
export function serviceDetailRows(service: ClientAreaTripService, limit = 12): DetailRow[] {
  const data = service.details;
  if (!data || typeof data !== "object") return [];
  const rows: DetailRow[] = [];
  const seen = new Set<string>();
  const push = (key: string) => {
    if (seen.has(key)) return;
    const value = detailValue((data as Record<string, unknown>)[key]);
    if (!value) return;
    seen.add(key);
    rows.push({ key, label: detailLabel(key), value });
  };
  for (const key of PREFERRED) push(key);
  for (const key of Object.keys(data)) push(key);
  return rows.slice(0, limit);
}

/** Ordena serviços pela data real; sem data vão para o fim, mantendo o tipo. */
export function sortServices(services: ClientAreaTripService[]): ClientAreaTripService[] {
  const key = (s: ClientAreaTripService) => {
    const d = parseTripDate(s.start_date ?? s.end_date);
    return d ? d.getTime() : null;
  };
  return [...services].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null && kb === null) return serviceTitle(a).localeCompare(serviceTitle(b));
    if (ka === null) return 1;
    if (kb === null) return -1;
    return ka - kb;
  });
}

export interface TimelineDay {
  /** "YYYY-MM-DD" */
  date: string;
  label: string;
  services: ClientAreaTripService[];
}

const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const WEEKDAYS = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
];

export function timelineDayLabel(date: string): string {
  const d = parseTripDate(date);
  if (!d) return date;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Programação cronológica: agrupa serviços pela data de início. Serviços sem
 * data ficam fora da linha do tempo (listados como "sem data definida").
 */
export function buildTimeline(services: ClientAreaTripService[]): TimelineDay[] {
  const byDate = new Map<string, ClientAreaTripService[]>();
  for (const service of sortServices(services)) {
    const raw = service.start_date ?? service.end_date;
    const d = parseTripDate(raw);
    if (!d || !raw) continue;
    const date = raw.slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(service);
    byDate.set(date, list);
  }
  return [...byDate.keys()]
    .sort()
    .map((date) => ({ date, label: timelineDayLabel(date), services: byDate.get(date)! }));
}

export function servicesWithoutDate(services: ClientAreaTripService[]): ClientAreaTripService[] {
  return sortServices(services).filter((s) => !parseTripDate(s.start_date ?? s.end_date));
}

/** Período do serviço em texto curto; null quando não há data. */
export function servicePeriodLabel(service: ClientAreaTripService): string | null {
  const start = detailValue(service.start_date);
  const end = detailValue(service.end_date);
  if (start && end && start !== end) return `${start} — ${end}`;
  return start ?? end ?? null;
}

export function travelerName(traveler: ClientAreaTraveler): string {
  return (traveler.name || "").trim() || "Viajante";
}

export const DETAIL_TABS = [
  { key: "geral", label: "Visão geral" },
  { key: "servicos", label: "Serviços" },
  { key: "programacao", label: "Programação" },
  { key: "viajantes", label: "Viajantes" },
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number]["key"];

export const DETAIL_EMPTY = {
  services: "Os serviços desta viagem ainda estão sendo preparados pela agência.",
  timeline: "A programação será exibida quando os serviços tiverem datas confirmadas.",
  travelers: "Os viajantes desta viagem ainda não foram cadastrados.",
} as const;

export const DETAIL_READONLY_NOTE =
  "Estas informações são mantidas pela agência e servem apenas para consulta.";
