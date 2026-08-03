/**
 * Regras centralizadas de ranking do Radar do Turismo / Notícias do Trade.
 *
 * Timezone autoritativo: America/Sao_Paulo.
 * Fórmula de engajamento (determinística, espelha a RPC `news_highlights`):
 *   score = visualizações (reads) + 2 × curtidas (likes)
 * Desempate: curtidas → visualizações → publicação mais recente → id estável.
 */

export const NEWS_TZ = "America/Sao_Paulo";

/** Componentes de data/hora locais (SP) de um instante. */
export function spParts(ref: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEWS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(ref);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekdayShort: get("weekday"),
  };
}

/** Data local (SP) no formato YYYY-MM-DD. */
export function spDateKey(ref: Date = new Date()): string {
  const p = spParts(ref);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** 0 = domingo … 6 = sábado, no fuso de São Paulo. */
export function spWeekday(ref: Date = new Date()): number {
  return WEEKDAY_INDEX[spParts(ref).weekdayShort] ?? 0;
}

/** true quando é sábado ou domingo em São Paulo. */
export function isWeekendSp(ref: Date = new Date()): boolean {
  const d = spWeekday(ref);
  return d === 0 || d === 6;
}

/** Segunda-feira (00:00 local) da semana corrente, como YYYY-MM-DD. */
export function spWeekStartKey(ref: Date = new Date()): string {
  const p = spParts(ref);
  const dow = spWeekday(ref);
  const diff = dow === 0 ? 6 : dow - 1; // domingo pertence à semana iniciada na segunda anterior
  const base = Date.UTC(p.year, p.month - 1, p.day) - diff * 86_400_000;
  const d = new Date(base);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Modo do bloco principal: seg–sex = Notícia do Dia; sáb–dom = Notícia da Semana. */
export function highlightMode(ref: Date = new Date()): "daily" | "weekly" {
  return isWeekendSp(ref) ? "weekly" : "daily";
}

export function highlightLabel(mode: "daily" | "weekly"): string {
  return mode === "weekly" ? "Notícia da Semana" : "Notícia do Dia";
}

/** Fórmula única de engajamento. */
export function newsEngagementScore(reads: number, likes: number): number {
  return (reads || 0) + (likes || 0) * 2;
}

/**
 * Elegibilidade temporal da curadoria manual — espelha exatamente as validações
 * da RPC `admin_set_news_curation` (erro `invalid_curation_period`).
 *
 * - daily: data de publicação local deve ser exatamente `periodStart`;
 * - weekly/top5: `periodStart` deve ser uma segunda-feira e a publicação local
 *   deve estar em [periodStart, periodStart + 7) ;
 * - a notícia precisa estar aprovada e visível.
 */
export function isCurationEligible(input: {
  curationType: "daily" | "weekly" | "top5";
  periodStart: string; // YYYY-MM-DD (local SP)
  publishedAt: string; // ISO
  status: string;
  hidden?: boolean | null;
}): boolean {
  if (input.status !== "aprovado" || input.hidden) return false;
  const pub = spDateKey(new Date(input.publishedAt));
  if (input.curationType === "daily") return pub === input.periodStart;

  const [y, m, d] = input.periodStart.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  // segunda-feira?
  if (new Date(start).getUTCDay() !== 1) return false;
  const [py, pm, pd] = pub.split("-").map(Number);
  const pubUtc = Date.UTC(py, pm - 1, pd);
  return pubUtc >= start && pubUtc < start + 7 * 86_400_000;
}

export interface RankableNews {
  id: string;
  reads_count: number;
  likes_count: number;
  data_publicacao: string;
}

/** Ordena por score → curtidas → leituras → recência → id. */
export function sortByEngagement<T extends RankableNews>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sa = newsEngagementScore(a.reads_count, a.likes_count);
    const sb = newsEngagementScore(b.reads_count, b.likes_count);
    if (sb !== sa) return sb - sa;
    if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
    if (b.reads_count !== a.reads_count) return b.reads_count - a.reads_count;
    const da = +new Date(a.data_publicacao);
    const db = +new Date(b.data_publicacao);
    if (db !== da) return db - da;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Mescla curadoria manual (posições fixas) com o ranking automático,
 * sem repetir notícias e com no máximo 5 posições.
 */
export function mergeTop5<T extends { id: string }>(
  manual: { position: number; item: T }[],
  auto: T[]
): { position: number; item: T; isManual: boolean }[] {
  const taken = new Map<number, { position: number; item: T; isManual: boolean }>();
  const usedIds = new Set<string>();

  for (const m of manual) {
    if (m.position < 1 || m.position > 5) continue;
    if (taken.has(m.position)) continue;
    if (usedIds.has(m.item.id)) continue;
    taken.set(m.position, { position: m.position, item: m.item, isManual: true });
    usedIds.add(m.item.id);
  }

  const queue = auto.filter((a) => !usedIds.has(a.id));
  for (let p = 1; p <= 5; p++) {
    if (taken.has(p)) continue;
    const next = queue.shift();
    if (!next) continue;
    taken.set(p, { position: p, item: next, isManual: false });
    usedIds.add(next.id);
  }

  return [...taken.values()].sort((a, b) => a.position - b.position);
}
/** Hora local (SP) a partir da qual as notícias entram na janela do dia. */
export const NEWS_DAY_START_HOUR = 7;

/**
 * Janela diária do Radar: mesmo dia local (America/Sao_Paulo) da referência e
 * publicada entre 07:00:00 e 23:59:59 (fuso de SP, nunca UTC/navegador).
 */
export function isWithinNewsDayWindow(publishedAt: string, ref: Date = new Date()): boolean {
  const d = new Date(publishedAt);
  if (Number.isNaN(+d)) return false;
  if (spDateKey(d) !== spDateKey(ref)) return false;
  return spParts(d).hour >= NEWS_DAY_START_HOUR;
}
