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
export type TicketPath = "theme" | "water_only" | "event_only" | "festival_needs_epcot";
export type DisneyEventTicket = "included" | "separate";
export type DisneyEventIntent = string | { id: string; ticket?: DisneyEventTicket };

/** Festivais do EPCOT: incluídos na entrada do parque (exigem ingresso válido do EPCOT, nunca ingresso separado). */
export const DISNEY_INCLUDED_EVENT_IDS = ["epcot-festival-arts", "epcot-flower-garden", "epcot-food-wine", "epcot-holidays"] as const;
export const eventTicketOf = (e: DisneyEventIntent): DisneyEventTicket =>
  typeof e !== "string" && e.ticket ? e.ticket : (DISNEY_INCLUDED_EVENT_IDS as readonly string[]).includes(typeof e === "string" ? e : e.id) ? "included" : "separate";
const evId = (e: DisneyEventIntent) => (typeof e === "string" ? e : e.id);
export function splitEvents(events: DisneyEventIntent[]) {
  return { included: events.filter((e) => eventTicketOf(e) === "included").map(evId), separate: events.filter((e) => eventTicketOf(e) === "separate").map(evId) };
}
/** Festival incluído escolhido sem EPCOT entre os temáticos. */
export const festivalNeedsEpcot = (themes: string[], events: DisneyEventIntent[]) => splitEvents(events).included.length > 0 && !themes.includes("epcot");

export type DisneyTicketRecommendation =
  | "one_park_per_day" | "park_hopper" | "water_park_and_sports" | "park_hopper_plus"
  | "guidance" | "water_only" | "event_only" | "epcot_festival_guidance";

export const RECOMMENDATION_LABEL: Record<DisneyTicketRecommendation, string> = {
  one_park_per_day: "Ingresso de 1 parque por dia",
  park_hopper: "Park Hopper",
  water_park_and_sports: "Water Park and Sports",
  park_hopper_plus: "Park Hopper Plus",
  guidance: "Orientação da agente para escolher o ingresso",
  water_only: "Ingresso de parque aquático (sem parques temáticos)",
  event_only: "Ingresso da festa/evento com ingresso separado (sem ingresso diurno)",
  epcot_festival_guidance: "Orientação: festival incluído na entrada do EPCOT (precisa de ingresso válido do EPCOT)",
};

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
export const clampThemeDays = (n: number) => clampInt(n, THEME_DAYS_MIN, THEME_DAYS_MAX);
export const clampWaterVisits = (n: number) => clampInt(n, 1, WATER_VISITS_MAX);

export function ticketPath(themes: string[], waters: string[], events: DisneyEventIntent[]): TicketPath | null {
  if (themes.length) return "theme";
  if (festivalNeedsEpcot(themes, events)) return "festival_needs_epcot";
  if (waters.length) return "water_only";
  if (splitEvents(events).separate.length) return "event_only";
  return null;
}

/** Park Hopper só faz sentido com 2+ parques temáticos e 2+ dias ou troca no dia. */
export const hopperApplies = (themes: string[]) => themes.length >= 2;

/**
 * Quatro combinações oficiais (troca entre temáticos × extras aquáticos/esportivos).
 * "guidance" quando o cliente pede ajuda em alguma das duas perguntas.
 */
export function recommendTicket(input: { themes: string[]; waters: string[]; events: DisneyEventIntent[]; hopper: Choice3 | null; waterExtras: Choice3 | null }): DisneyTicketRecommendation | null {
  const path = ticketPath(input.themes, input.waters, input.events);
  if (!path) return null;
  // Festival do EPCOT sem EPCOT no plano: nunca indicar ingresso separado; pedir orientação.
  if (festivalNeedsEpcot(input.themes, input.events)) return "epcot_festival_guidance";
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

/** Dias em Orlando contando chegada e saída (datas locais, sem fuso/off-by-one). */
export function tripDaysInclusive(arrival: string, departure: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const a = re.exec(arrival), d = re.exec(departure);
  if (!a || !d) return null;
  const ua = Date.UTC(+a[1], +a[2] - 1, +a[3]), ud = Date.UTC(+d[1], +d[2] - 1, +d[3]);
  if (ud < ua) return null;
  return Math.round((ud - ua) / 86400000) + 1;
}

/** Dias de parque temático compatíveis com a viagem (não vale quando o cliente pede ajuda). */
export function validateThemeDays(p: { themes: string[]; themeDays: number | null; themeDaysHelp: boolean; periodMode: PeriodMode | null; arrival: string; departure: string }): string | null {
  if (!p.themes.length || p.themeDaysHelp || !p.themeDays) return null;
  if (p.periodMode !== "dates") return null;
  const trip = tripDaysInclusive(p.arrival, p.departure);
  if (trip && p.themeDays > trip) return `Sua viagem tem ${trip} ${trip === 1 ? "dia" : "dias"} em Orlando (contando chegada e saída), mas você pediu ${p.themeDays} dias de parques temáticos. Reduza os dias ou marque "Quero ajuda para decidir".`;
  return null;
}

/** Mais parques temáticos que dias, sem troca no mesmo dia: o ingresso não atende a intenção. */
export function validateHopperIntent(p: { themes: string[]; themeDays: number | null; themeDaysHelp: boolean; hopper: Choice3 | null }): string | null {
  if (!hopperApplies(p.themes) || p.themeDaysHelp || !p.themeDays || p.hopper !== "no") return null;
  if (p.themes.length > p.themeDays) return `Você escolheu ${p.themes.length} parques temáticos em ${p.themeDays} ${p.themeDays === 1 ? "dia" : "dias"}. Sem troca no mesmo dia, cada dia vale para um parque. Escolha "Sim", "Quero orientação" ou aumente os dias.`;
  return null;
}

export const KID_AGE_MIN = 3, KID_AGE_MAX = 9, INFANT_AGE_MAX = 2;
/** `ages`: primeiro as crianças de 3 a 9 anos, depois os menores de 3. */
export function validateTravelers(t: { tenPlus: number; kids: number; infants: number; ages: string[] }): string | null {
  const ints = [t.tenPlus, t.kids, t.infants];
  if (ints.some((n) => !Number.isInteger(n) || n < 0)) return "Revise a quantidade de viajantes.";
  if (t.tenPlus + t.kids + t.infants < 1) return "Informe quem vai viajar.";
  if (t.tenPlus < 1) return "Informe ao menos uma pessoa com 10 anos ou mais.";
  if (t.ages.length !== t.kids + t.infants || t.ages.some((a) => String(a).trim() === "")) return "Informe a idade de cada criança na data da visita.";
  for (let i = 0; i < t.ages.length; i++) {
    const raw = String(t.ages[i]).trim();
    if (!/^\d{1,2}$/.test(raw)) return "Use apenas números inteiros nas idades.";
    const n = Number(raw);
    if (i < t.kids) { if (n < KID_AGE_MIN || n > KID_AGE_MAX) return `A idade da criança ${i + 1} precisa estar entre 3 e 9 anos. Para 10 anos ou mais, conte no primeiro grupo.`; }
    else if (n > INFANT_AGE_MAX) return `A idade do menor de 3 anos ${i - t.kids + 1} precisa estar entre 0 e 2 anos.`;
  }
  return null;
}

export interface DisneyPlan {
  themes: DisneyThemeParkId[];
  waters: DisneyWaterParkId[];
  events: { id: string; name: string; ticket?: DisneyEventTicket }[];
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
  const rec = recommendTicket({ themes: clean.themes, waters: clean.waters, events: clean.events, hopper: clean.hopper, waterExtras: clean.waters.length ? "yes" : "no" })!;
  const ev = splitEvents(clean.events);
  const evName = (id: string) => clean.events.find((e) => e.id === id)?.name ?? id;
  const needsEpcot = festivalNeedsEpcot(clean.themes, clean.events);
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
    ev.included.length ? `Festivais incluídos na entrada do EPCOT: ${ev.included.map(evName).join(", ")}${needsEpcot ? " (precisa de ingresso válido do EPCOT; EPCOT não escolhido — orientar)" : ""}` : "",
    ev.separate.length ? `Festas/eventos com ingresso separado: ${ev.separate.map(evName).join(", ")}` : "",
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
      needsEpcot ? "Festival do EPCOT é incluído na entrada do parque: orientar o cliente sobre ingresso com EPCOT; não cotar ingresso separado de festival." : "",
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
      caminho: ticketPath(clean.themes, clean.waters, clean.events) ?? "",
      tematicos_ids: clean.themes.join(","),
      aquaticos_ids: clean.waters.join(","),
      eventos_ids: clean.events.map((e) => e.id).join(","),
      eventos_incluidos_ids: ev.included.join(","),
      eventos_ingresso_separado_ids: ev.separate.join(","),
      festival_exige_epcot: needsEpcot ? "Sim" : "Não",
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
