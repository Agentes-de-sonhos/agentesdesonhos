/**
 * Regras do assistente de INTENÇÃO de ingressos Walt Disney World (não é checkout).
 * O cliente escolhe intenções; a agência confirma produto, validade, benefícios e preço.
 * Regras próprias da Disney — nenhuma regra Universal (ex.: limite de 14 dias) é reutilizada.
 */
export type DisneyThemeParkId = "magic-kingdom" | "epcot" | "hollywood-studios" | "animal-kingdom";
export type DisneyWaterParkId = "typhoon-lagoon" | "blizzard-beach";

export const DISNEY_THEME_PARKS: { id: DisneyThemeParkId; name: string }[] = [
  { id: "magic-kingdom", name: "Magic Kingdom Park" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood-studios", name: "Disney's Hollywood Studios" },
  { id: "animal-kingdom", name: "Disney's Animal Kingdom Theme Park" },
];
export const DISNEY_WATER_PARKS: { id: DisneyWaterParkId; name: string }[] = [
  { id: "typhoon-lagoon", name: "Disney's Typhoon Lagoon Water Park" },
  { id: "blizzard-beach", name: "Disney's Blizzard Beach Water Park" },
];

export const THEME_DAYS_MIN = 1;
export const THEME_DAYS_MAX = 10;
export const WATER_VISITS_MAX = 10;

export type Choice3 = "yes" | "no" | "guidance";
export type PeriodMode = "dates" | "months";
export type TicketPath = "theme" | "water_only" | "event_only";

export type DisneyTicketRecommendation =
  | "one_park_per_day" | "park_hopper" | "water_park_and_sports" | "park_hopper_plus"
  | "guidance" | "water_only" | "event_only";

export const RECOMMENDATION_LABEL: Record<DisneyTicketRecommendation, string> = {
  one_park_per_day: "Ingresso de 1 parque por dia",
  park_hopper: "Park Hopper",
  water_park_and_sports: "Water Park and Sports",
  park_hopper_plus: "Park Hopper Plus",
  guidance: "Orientação da agente para escolher o ingresso",
  water_only: "Ingresso de parque aquático (sem parques temáticos)",
  event_only: "Ingresso do evento especial (sem ingresso diurno)",
};

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
export const clampThemeDays = (n: number) => clampInt(n, THEME_DAYS_MIN, THEME_DAYS_MAX);
export const clampWaterVisits = (n: number) => clampInt(n, 1, WATER_VISITS_MAX);

export function ticketPath(themes: string[], waters: string[], events: string[]): TicketPath | null {
  if (themes.length) return "theme";
  if (waters.length) return "water_only";
  if (events.length) return "event_only";
  return null;
}

/** Park Hopper só faz sentido com 2+ parques temáticos e 2+ dias ou troca no dia. */
export const hopperApplies = (themes: string[]) => themes.length >= 2;

/**
 * Quatro combinações oficiais (troca entre temáticos × extras aquáticos/esportivos).
 * "guidance" quando o cliente pede ajuda em alguma das duas perguntas.
 */
export function recommendTicket(input: { themes: string[]; waters: string[]; events: string[]; hopper: Choice3 | null; waterExtras: Choice3 | null }): DisneyTicketRecommendation | null {
  const path = ticketPath(input.themes, input.waters, input.events);
  if (!path) return null;
  if (path === "water_only") return "water_only";
  if (path === "event_only") return "event_only";
  const hop = hopperApplies(input.themes) ? input.hopper : "no";
  const extras = input.waters.length ? (input.waterExtras ?? "yes") : (input.waterExtras ?? "no");
  if (hop === "guidance" || extras === "guidance") return "guidance";
  const h = hop === "yes";
  const x = extras === "yes";
  if (h && x) return "park_hopper_plus";
  if (h) return "park_hopper";
  if (x) return "water_park_and_sports";
  return "one_park_per_day";
}

/** Remove dados que deixaram de valer após o cliente voltar e mudar escolhas. */
export function pruneIncompatible<T extends { themes: string[]; waters: string[]; hopper: Choice3 | null; waterVisits: number | null; lightningLane: boolean; themeDays: number | null; themeDaysHelp: boolean }>(s: T): T {
  return {
    ...s,
    hopper: hopperApplies(s.themes) ? s.hopper : null,
    waterVisits: s.waters.length ? s.waterVisits : null,
    lightningLane: s.themes.length ? s.lightningLane : false,
    themeDays: s.themes.length ? s.themeDays : null,
    themeDaysHelp: s.themes.length ? s.themeDaysHelp : false,
  };
}

const PT_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const monthLabel = (ym: string) => { const [y, m] = ym.split("-"); return `${PT_MONTHS[Number(m) - 1]} de ${y}`; };
export const fmtDateBR = (iso: string) => iso.split("-").reverse().join("/");
export function upcomingMonths(today: string, count = 24): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const t = (m - 1) + i;
    return `${y + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

export function validatePeriod(mode: PeriodMode | null, arrival: string, departure: string, months: string[], today: string): string | null {
  if (!mode) return "Conte quando pretende viajar: datas ou meses possíveis.";
  if (mode === "dates") {
    if (!arrival || !departure) return "Informe a chegada e a saída de Orlando.";
    if (arrival < today) return "A chegada precisa ser hoje ou uma data futura.";
    if (departure < arrival) return "A saída precisa ser igual ou posterior à chegada.";
    return null;
  }
  return months.length ? null : "Marque pelo menos um mês possível.";
}

export function validateTravelers(t: { tenPlus: number; kids: number; infants: number; ages: string[] }): string | null {
  if (t.tenPlus + t.kids + t.infants < 1) return "Informe quem vai viajar.";
  if (t.tenPlus < 1) return "Informe ao menos uma pessoa com 10 anos ou mais.";
  if (t.ages.length !== t.kids + t.infants || t.ages.some((a) => a === "")) return "Informe a idade de cada criança na data da visita.";
  return null;
}

export interface DisneyPlan {
  themes: DisneyThemeParkId[];
  waters: DisneyWaterParkId[];
  events: { id: string; name: string }[];
  periodMode: PeriodMode;
  arrival: string;
  departure: string;
  months: string[];
  themeDays: number | null;
  themeDaysHelp: boolean;
  hopper: Choice3 | null;
  waterVisits: number | null;
  lightningLane: boolean;
  hotelInterest: boolean;
  tenPlus: number;
  kids: number;
  infants: number;
  ages: number[];
  name: string;
  whatsapp: string;
  email: string;
}

const themeName = (id: string) => DISNEY_THEME_PARKS.find((p) => p.id === id)?.name ?? id;
const waterName = (id: string) => DISNEY_WATER_PARKS.find((p) => p.id === id)?.name ?? id;
const CHOICE_PT: Record<Choice3, string> = { yes: "Sim", no: "Não", guidance: "Quer orientação" };

/** Payload no formato do fluxo existente de solicitações do site (mesma função da Central). */
export function buildDisneyRequest(plan: DisneyPlan) {
  const clean = pruneIncompatible(plan);
  const rec = recommendTicket({ themes: clean.themes, waters: clean.waters, events: clean.events.map((e) => e.id), hopper: clean.hopper, waterExtras: clean.waters.length ? "yes" : "no" })!;
  const isDates = plan.periodMode === "dates";
  const months = isDates ? [] : [...plan.months].sort();
  const period = isDates ? `${fmtDateBR(plan.arrival)} a ${fmtDateBR(plan.departure)} (em Orlando)` : `Meses possíveis: ${months.map(monthLabel).join(", ")}`;
  const days = clean.themes.length ? (clean.themeDaysHelp ? "quer ajuda para decidir" : `${clean.themeDays} ${clean.themeDays === 1 ? "dia" : "dias"}`) : "não se aplica";
  const pax = `${plan.tenPlus} com 10 anos ou mais, ${plan.kids} de 3 a 9 anos, ${plan.infants} menores de 3${plan.ages.length ? ` (idades: ${plan.ages.join(", ")})` : ""}`;
  const parts = [
    `Ingressos Walt Disney World | Período: ${period}`,
    clean.themes.length ? `Temáticos: ${clean.themes.map(themeName).join(", ")} | Dias de temáticos: ${days}` : "",
    clean.hopper ? `Troca no mesmo dia: ${CHOICE_PT[clean.hopper]}` : "",
    clean.waters.length ? `Aquáticos: ${clean.waters.map(waterName).join(", ")} | Visitas aquáticas: ${clean.waterVisits ?? 1}` : "",
    clean.events.length ? `Eventos de interesse: ${clean.events.map((e) => e.name).join(", ")}` : "",
    `Opção indicada para cotação: ${RECOMMENDATION_LABEL[rec]}`,
    `Viajantes: ${pax}`,
  ].filter(Boolean);
  return {
    service_key: "ingressos",
    service_label: "Ingressos",
    destination: "Orlando, Flórida",
    summary: parts.join(" | ").slice(0, 1990),
    notes: [
      "Origem: landing /disney (assistente de intenção de ingressos).",
      "Intenção do cliente; a agência confirma produto, validade, benefícios, disponibilidade e preço.",
      clean.events.length ? "Eventos: apenas interesse; calendário e disponibilidade a confirmar." : "",
      clean.lightningLane ? "Quer orientação sobre Lightning Lane (complemento, não incluído automaticamente)." : "",
      plan.hotelInterest ? "Também tem interesse em hotel Disney." : "",
    ].filter(Boolean).join("\n"),
    lead_name: plan.name.trim(),
    lead_phone: plan.whatsapp.trim(),
    lead_email: plan.email.trim() || null,
    preferred_channel: "WhatsApp",
    best_time: "Qualquer horário",
    consent: true,
    consent_version: "v1",
    details: {
      origem: "disney_landing_tickets",
      pagina: "/disney",
      destino: "Orlando, Flórida",
      caminho: ticketPath(clean.themes, clean.waters, clean.events.map((e) => e.id)) ?? "",
      tematicos_ids: clean.themes.join(","),
      aquaticos_ids: clean.waters.join(","),
      eventos_ids: clean.events.map((e) => e.id).join(","),
      dias_tematicos: clean.themeDaysHelp ? "ajuda" : clean.themeDays ? String(clean.themeDays) : "",
      visitas_aquaticas: clean.waterVisits ? String(clean.waterVisits) : "",
      troca_mesmo_dia: clean.hopper ?? "",
      recomendacao: rec,
      lightning_lane_orientacao: clean.lightningLane ? "Sim" : "Não",
      interesse_hotel: plan.hotelInterest ? "Sim" : "Não",
      modo_periodo: isDates ? "datas" : "meses",
      check_in: isDates ? plan.arrival : "",
      check_out: isDates ? plan.departure : "",
      meses: months.join(","),
      adultos: String(plan.tenPlus),
      criancas: String(plan.kids + plan.infants),
      criancas_3_9: String(plan.kids),
      menores_3: String(plan.infants),
      idades_criancas: plan.ages.join(", "),
      servicos: "Ingressos",
      servicos_keys: "ingressos",
    } as Record<string, string>,
  };
}
