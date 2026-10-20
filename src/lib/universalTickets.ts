/**
 * Regras puras do configurador de ingressos da landing Universal.
 * O limite de 14 dias é implícito (somatório), nunca exibido como meta.
 */
export const UNIVERSAL_MAX_DAYS = 14;

export type UniversalParkId = "universal-studios" | "islands-of-adventure" | "epic-universe" | "volcano-bay";
export const UNIVERSAL_TICKET_PARKS: { id: UniversalParkId; name: string; kind: "theme" | "water" }[] = [
  { id: "universal-studios", name: "Universal Studios Florida", kind: "theme" },
  { id: "islands-of-adventure", name: "Universal Islands of Adventure", kind: "theme" },
  { id: "epic-universe", name: "Universal Epic Universe", kind: "theme" },
  { id: "volcano-bay", name: "Universal Volcano Bay", kind: "water" },
];
export const parkName = (id: UniversalParkId) => UNIVERSAL_TICKET_PARKS.find((p) => p.id === id)!.name;

export type ExtraId = "express" | "vip" | "hhn";
export const UNIVERSAL_EXTRAS: { id: ExtraId; name: string; description: string }[] = [
  { id: "express", name: "Universal Express", description: "Complemento para usar filas reduzidas em atrações participantes. Exige ingresso de parque compatível." },
  { id: "vip", name: "VIP Experience", description: "Passeio com guia e acesso prioritário às atrações, conforme a modalidade escolhida." },
  { id: "hhn", name: "Halloween Horror Nights", description: "Evento noturno de terror com ingresso separado. Datas e disponibilidade são confirmadas pela nossa equipe." },
];

export type DaysMode = "one_each" | "repeat";
export type PeriodMode = "dates" | "months";

/** Seleção de parques sempre na ordem oficial. */
export function orderParks(ids: UniversalParkId[]): UniversalParkId[] {
  return UNIVERSAL_TICKET_PARKS.map((p) => p.id).filter((id) => ids.includes(id));
}

/** Dias efetivos por parque conforme o modo escolhido. */
export function effectiveDays(selected: UniversalParkId[], mode: DaysMode, days: Partial<Record<UniversalParkId, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of orderParks(selected)) out[id] = mode === "one_each" ? 1 : Math.max(1, days[id] ?? 1);
  return out;
}

export const totalDays = (d: Record<string, number>) => Object.values(d).reduce((a, b) => a + b, 0);

/** Máximo permitido para um parque: o que sobra do somatório, reservando o que os outros já usam (cada um ≥1). */
export function maxDaysFor(id: UniversalParkId, selected: UniversalParkId[], days: Record<string, number>): number {
  const others = orderParks(selected).filter((x) => x !== id).reduce((sum, x) => sum + Math.max(1, days[x] ?? 1), 0);
  return Math.max(1, UNIVERSAL_MAX_DAYS - others);
}

/** Ajusta dias ao mudar seleção: novos parques entram com 1, removidos saem, e o total nunca passa de 14. */
export function normalizeDays(selected: UniversalParkId[], days: Partial<Record<UniversalParkId, number>>): Record<string, number> {
  const ordered = orderParks(selected);
  const out: Record<string, number> = {};
  for (const id of ordered) out[id] = Math.max(1, Math.floor(days[id] ?? 1));
  let excess = totalDays(out) - UNIVERSAL_MAX_DAYS;
  for (const id of [...ordered].reverse()) {
    if (excess <= 0) break;
    const cut = Math.min(excess, out[id] - 1);
    out[id] -= cut;
    excess -= cut;
  }
  return out;
}

export const bothClassicParks = (selected: UniversalParkId[]) =>
  selected.includes("universal-studios") && selected.includes("islands-of-adventure");

const ymRe = /^\d{4}-(0[1-9]|1[0-2])$/;
const ymdRe = /^\d{4}-\d{2}-\d{2}$/;

/** Dias de calendário em Orlando (chegada e saída inclusas). */
export function calendarDays(arrival: string, departure: string): number | null {
  if (!ymdRe.test(arrival) || !ymdRe.test(departure)) return null;
  const [ay, am, ad] = arrival.split("-").map(Number);
  const [dy, dm, dd] = departure.split("-").map(Number);
  return Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ay, am - 1, ad)) / 86400000) + 1;
}

export function validatePeriod(mode: PeriodMode | null, arrival: string, departure: string, months: string[], today: string): string | null {
  if (!mode) return "Escolha como prefere informar o período.";
  if (mode === "dates") {
    if (!ymdRe.test(arrival) || !ymdRe.test(departure)) return "Informe a chegada e a saída de Orlando.";
    if (arrival < today) return "A chegada a Orlando não pode ser uma data passada.";
    if (departure < arrival) return "A saída de Orlando deve ser igual ou posterior à chegada.";
    return null;
  }
  if (months.length === 0) return "Selecione ao menos um mês possível.";
  if (months.some((m) => !ymRe.test(m))) return "Mês inválido.";
  return null;
}

/** Meses YYYY-MM tocados pelo intervalo de datas. */
export function monthsInRange(arrival: string, departure: string): string[] {
  if (!ymdRe.test(arrival) || !ymdRe.test(departure) || departure < arrival) return [];
  const out: string[] = [];
  let [y, m] = arrival.split("-").map(Number);
  const [ey, em] = departure.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** Halloween Horror Nights só aparece quando o período toca setembro ou outubro. */
export function hhnEligible(mode: PeriodMode | null, arrival: string, departure: string, months: string[]): boolean {
  const list = mode === "dates" ? monthsInRange(arrival, departure) : mode === "months" ? months : [];
  return list.some((ym) => ym.endsWith("-09") || ym.endsWith("-10"));
}

export function allowedExtras(extras: ExtraId[], eligibleHhn: boolean): ExtraId[] {
  return extras.filter((e) => e !== "hhn" || eligibleHhn);
}

const PT_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const monthLabel = (ym: string) => { const [y, m] = ym.split("-"); return `${PT_MONTHS[Number(m) - 1]} de ${y}`; };
export const fmtDateBR = (iso: string) => iso.split("-").reverse().join("/");

/** Meses futuros a partir do mês atual (inclusive), com ano explícito. */
export function upcomingMonths(today: string, count = 24): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const t = (m - 1) + i;
    return `${y + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

export interface UniversalPlan {
  selected: UniversalParkId[];
  daysMode: DaysMode;
  days: Record<string, number>;
  periodMode: PeriodMode;
  arrival: string;
  departure: string;
  months: string[];
  parkToPark: boolean | null;
  extras: ExtraId[];
  adults: number;
  childAges: number[];
  name: string;
  whatsapp: string;
  email: string;
}

/** Monta o envio para o serviço existente de solicitações do site (mesmo fluxo da Central). */
export function buildUniversalRequest(plan: UniversalPlan) {
  const parks = orderParks(plan.selected);
  const both = bothClassicParks(parks);
  const p2p = both && plan.parkToPark === true;
  const eligible = hhnEligible(plan.periodMode, plan.arrival, plan.departure, plan.months);
  const extras = allowedExtras(plan.extras, eligible);
  const isDates = plan.periodMode === "dates";
  const months = isDates ? [] : [...plan.months].sort();
  const period = isDates ? `${fmtDateBR(plan.arrival)} a ${fmtDateBR(plan.departure)} (em Orlando)` : `Meses possíveis: ${months.map(monthLabel).join(", ")}`;
  const daysText = parks.map((id) => `${parkName(id)}: ${plan.days[id]} ${plan.days[id] === 1 ? "dia" : "dias"}`).join(" | ");
  const total = parks.reduce((s, id) => s + (plan.days[id] ?? 0), 0);
  const access = both ? (p2p ? "Park-to-Park (quer trocar entre Universal Studios Florida e Universal Islands of Adventure no mesmo dia, com Hogwarts Express)" : "Um parque por dia") : "Um parque por dia";
  const extraNames = extras.map((e) => UNIVERSAL_EXTRAS.find((x) => x.id === e)!.name);
  const pax = `${plan.adults} ${plan.adults === 1 ? "adulto" : "adultos"}${plan.childAges.length ? ` e ${plan.childAges.length} ${plan.childAges.length === 1 ? "criança" : "crianças"} (${plan.childAges.join(", ")} anos)` : ""}`;
  return {
    service_key: "ingressos",
    service_label: "Ingressos",
    destination: "Orlando, Flórida",
    summary: `Ingressos Universal Orlando Resort | Período: ${period} | ${daysText} | Total: ${total} dias de parque | Acesso: ${access} | Viajantes: ${pax}${extraNames.length ? ` | Interesse em: ${extraNames.join(", ")}` : ""}`.slice(0, 1990),
    notes: [
      "Origem: landing /universal (configurador de ingressos).",
      "O cliente enviou o plano; a agência identifica o ingresso correspondente.",
      extras.includes("hhn") ? "Halloween Horror Nights: apenas interesse; datas e disponibilidade a confirmar." : "",
    ].filter(Boolean).join("\n"),
    lead_name: plan.name.trim(),
    lead_phone: plan.whatsapp.trim(),
    lead_email: plan.email.trim() || null,
    preferred_channel: "WhatsApp",
    best_time: "Qualquer horário",
    consent: true,
    consent_version: "v1",
    details: {
      origem: "universal_landing_tickets",
      pagina: "/universal",
      destino: "Orlando, Flórida",
      parques_ids: parks.join(","),
      parques: parks.map(parkName).join(", "),
      dias_por_parque: daysText,
      ...Object.fromEntries(parks.map((id) => [`dias_${id.replace(/-/g, "_")}`, String(plan.days[id])])),
      total_dias_parques: String(total),
      modo_dias: plan.daysMode === "one_each" ? "Um dia para cada parque" : "Repetir um ou mais parques",
      modo_periodo: isDates ? "datas" : "meses",
      check_in: isDates ? plan.arrival : "",
      check_out: isDates ? plan.departure : "",
      meses: months.join(","),
      acesso: p2p ? "park_to_park" : "um_parque_por_dia",
      hogwarts_express: both ? (p2p ? "Sim" : "Não") : "Não se aplica",
      adultos: String(plan.adults),
      criancas: String(plan.childAges.length),
      idades_criancas: plan.childAges.join(", "),
      extras_ids: extras.join(","),
      extras: extraNames.join(", "),
      servicos: "Ingressos",
      servicos_keys: "ingressos",
    } as Record<string, string>,
  };
}
