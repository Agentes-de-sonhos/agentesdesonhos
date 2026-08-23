/**
 * Área do Cliente White Label — Etapa 3: “Minhas viagens” com dados reais.
 *
 * Fonte canônica: a tabela `operations` (viagem/operação efetivamente
 * contratada, criada quando a oportunidade é fechada). Orçamentos,
 * oportunidades, simulações e rascunhos NUNCA entram aqui.
 *
 * Este módulo concentra TODA a regra de classificação e ordenação — o servidor
 * apenas resolve a propriedade dos registros (agência + cliente da sessão) e
 * devolve campos seguros para o passageiro. Nenhum valor financeiro, custo,
 * comissão, fornecedor ou anotação interna trafega neste modelo.
 */

/** Viagem como o passageiro pode vê-la (payload seguro da Edge Function). */
export interface ClientAreaTrip {
  id: string;
  title: string | null;
  destination: string | null;
  /** "YYYY-MM-DD" ou null quando a agência ainda não confirmou as datas. */
  start_date: string | null;
  end_date: string | null;
  /** Estágio operacional canônico (ou chave livre de pipeline personalizado). */
  stage: string | null;
  /** Nome do estágio no pipeline da agência, quando existir. */
  stage_label?: string | null;
  travelers_count: number | null;
  services_count: number | null;
  cover_url: string | null;
}

export type TripGroup = "andamento" | "proximas" | "anteriores" | "canceladas";

export const TRIP_GROUPS: { key: TripGroup; label: string }[] = [
  { key: "andamento", label: "Em andamento" },
  { key: "proximas", label: "Próximas" },
  { key: "anteriores", label: "Anteriores" },
  { key: "canceladas", label: "Canceladas" },
];

export const TRIPS_INTRO =
  "Acompanhe suas próximas experiências e consulte viagens anteriores.";
export const TRIPS_EMPTY = "Você ainda não possui viagens disponíveis nesta área.";
export const DATE_TBD = "Data a confirmar";

/** Estágios canônicos de `operations` em linguagem amigável ao passageiro. */
const STAGE_LABELS: Record<string, string> = {
  venda_confirmada: "Viagem confirmada",
  emissao: "Reservas em emissão",
  documentacao: "Documentação em andamento",
  entrega: "Preparando sua viagem",
  pre_embarque: "Pré-embarque",
  em_viagem: "Em viagem",
  pos_viagem: "Viagem concluída",
  finalizado: "Viagem finalizada",
};

/** Estágios que significam “a viagem já terminou”, independente das datas. */
const FINISHED_STAGES = new Set(["pos_viagem", "finalizado"]);
/** Estágio que significa “a viagem começou”, independente das datas. */
const ONGOING_STAGES = new Set(["em_viagem"]);

/**
 * Cancelamento é reconhecido SOMENTE quando há marcação explícita — uma viagem
 * incompleta (sem datas, sem serviços) nunca é tratada como cancelada.
 */
export function isCancelledStage(stage?: string | null, label?: string | null): boolean {
  const text = `${stage ?? ""} ${label ?? ""}`.toLowerCase();
  return /cancel/.test(text);
}

/** Rótulo amigável do status; nunca expõe jargão interno do CRM. */
export function tripStatusLabel(trip: ClientAreaTrip): string {
  if (isCancelledStage(trip.stage, trip.stage_label)) return "Viagem cancelada";
  const canonical = trip.stage ? STAGE_LABELS[trip.stage] : undefined;
  return canonical || trip.stage_label || "Viagem em preparação";
}

/** Data local (meia-noite) a partir de "YYYY-MM-DD" — sem deslocar fuso. */
export function parseTripDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function midnight(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

/**
 * Classificação única e testável.
 * - Canceladas: apenas com marcação explícita de cancelamento.
 * - Em andamento: já começou e não encerrou (por datas ou por estágio).
 * - Próximas: começa no futuro e não foi cancelada.
 * - Anteriores: já encerrou e não foi cancelada.
 * - Sem datas: segue o estágio operacional real (padrão: próximas), nunca é
 *   inventada como cancelada ou concluída.
 */
export function classifyTrip(trip: ClientAreaTrip, now: Date = new Date()): TripGroup {
  if (isCancelledStage(trip.stage, trip.stage_label)) return "canceladas";

  const today = midnight(now);
  const start = parseTripDate(trip.start_date);
  const end = parseTripDate(trip.end_date) ?? start;

  if (trip.stage && FINISHED_STAGES.has(trip.stage)) return "anteriores";
  if (trip.stage && ONGOING_STAGES.has(trip.stage)) return "andamento";

  if (!start) return "proximas";
  if (end && end.getTime() < today.getTime()) return "anteriores";
  if (start.getTime() > today.getTime()) return "proximas";
  return "andamento";
}

/**
 * Ordenação por grupo: em andamento e próximas pela data mais próxima;
 * anteriores e canceladas pelas mais recentes. Viagens sem data vão para o fim.
 */
export function sortTrips(trips: ClientAreaTrip[], group: TripGroup): ClientAreaTrip[] {
  const desc = group === "anteriores" || group === "canceladas";
  const key = (t: ClientAreaTrip) => {
    const d = parseTripDate(desc ? t.end_date ?? t.start_date : t.start_date ?? t.end_date);
    return d ? d.getTime() : null;
  };
  return [...trips].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null && kb === null) return (a.title || "").localeCompare(b.title || "");
    if (ka === null) return 1;
    if (kb === null) return -1;
    return desc ? kb - ka : ka - kb;
  });
}

export type GroupedTrips = Record<TripGroup, ClientAreaTrip[]>;

/** Agrupa e ordena numa única passagem — usado pela lista e pela home. */
export function groupTrips(trips: ClientAreaTrip[], now: Date = new Date()): GroupedTrips {
  const grouped: GroupedTrips = { andamento: [], proximas: [], anteriores: [], canceladas: [] };
  for (const trip of trips) grouped[classifyTrip(trip, now)].push(trip);
  for (const g of Object.keys(grouped) as TripGroup[]) grouped[g] = sortTrips(grouped[g], g);
  return grouped;
}

/** Aba inicial: prioriza andamento, depois próximas, depois anteriores. */
export function defaultTripGroup(grouped: GroupedTrips): TripGroup {
  if (grouped.andamento.length) return "andamento";
  if (grouped.proximas.length) return "proximas";
  if (grouped.anteriores.length) return "anteriores";
  return grouped.canceladas.length ? "canceladas" : "proximas";
}

/** Grupos exibidos: “Canceladas” só aparece quando existirem registros. */
export function visibleTripGroups(grouped: GroupedTrips): TripGroup[] {
  return TRIP_GROUPS.map((g) => g.key).filter(
    (g) => g !== "canceladas" || grouped.canceladas.length > 0,
  );
}

/** Viagem em destaque na página inicial: andamento > próxima mais próxima. */
export function highlightTrip(grouped: GroupedTrips): ClientAreaTrip | null {
  return grouped.andamento[0] ?? grouped.proximas[0] ?? null;
}

export function tripTitle(trip: ClientAreaTrip): string {
  return (trip.title || trip.destination || "Sua viagem").trim();
}

const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Período legível; "Data a confirmar" quando a agência ainda não definiu. */
export function tripPeriodLabel(trip: ClientAreaTrip): string {
  const start = parseTripDate(trip.start_date);
  const end = parseTripDate(trip.end_date);
  if (!start && !end) return DATE_TBD;
  if (start && end) {
    return start.getTime() === end.getTime()
      ? shortDate(start)
      : `${shortDate(start)} — ${shortDate(end)}`;
  }
  return shortDate((start ?? end) as Date);
}

/** Resumo de serviços; null quando não há informação confiável. */
export function tripServicesLabel(trip: ClientAreaTrip): string | null {
  const n = trip.services_count ?? 0;
  if (!n) return null;
  return n === 1 ? "1 serviço" : `${n} serviços`;
}

/** Resumo de viajantes; só exibido quando o dado é confiável (> 0). */
export function tripTravelersLabel(trip: ClientAreaTrip): string | null {
  const n = trip.travelers_count ?? 0;
  if (!n || n < 1) return null;
  return n === 1 ? "1 viajante" : `${n} viajantes`;
}

export function tripPathFor(id: string): string {
  return `/area-do-cliente/viagens/${id}`;
}

/** Lê o id da viagem do caminho `/area-do-cliente/viagens/:id`. */
export function tripIdFromPath(pathname: string): string | null {
  const m = /^\/area-do-cliente\/viagens\/([^/?#]+)/.exec(pathname || "");
  return m ? decodeURIComponent(m[1]) : null;
}
