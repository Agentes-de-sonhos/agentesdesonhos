/**
 * Piloto "Montar orçamento com IA": verificações de cronologia da prévia.
 * Nunca corrige datas — apenas aponta problemas para o agente decidir.
 */

export interface TimelineBlock {
  id: string;
  type: string;
  label?: string;
  data: Record<string, any>;
}

export type TimelineWarningKind =
  | "past_date"
  | "uncovered_nights"
  | "hotel_overlap"
  | "invalid_date"
  | "checkout_before_checkin";

export interface TimelineWarning {
  kind: TimelineWarningKind;
  blockId?: string;
  message: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Converte "YYYY-MM-DD" em dia local (sem fuso). */
export function parseIsoDay(v: unknown): Date | null {
  if (typeof v !== "string" || !ISO.test(v.trim())) return null;
  const [y, m, d] = v.trim().split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const DAY = 86_400_000;
const dayIndex = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);

function blockDates(b: TimelineBlock): { key: string; value: unknown }[] {
  const d = b.data || {};
  switch (b.type) {
    case "flight":
      return [
        { key: "data_ida", value: d.resumo?.data_ida },
        { key: "data_retorno", value: d.resumo?.data_retorno },
        ...((Array.isArray(d.voos) ? d.voos : []) as any[]).map((v, i) => ({ key: `voo_${i + 1}`, value: v?.data_saida })),
      ];
    case "hotel":
      return [{ key: "check_in", value: d.check_in }, { key: "check_out", value: d.check_out }];
    case "attraction":
      return [{ key: "data", value: d.data }];
    case "insurance":
      return [{ key: "data_inicio", value: d.data_inicio }, { key: "data_fim", value: d.data_fim }];
    default:
      return [];
  }
}

/** Período da viagem: datas da passagem (ida/retorno) ou as informadas. */
export function tripRange(blocks: TimelineBlock[], meta?: { data_inicio?: string; data_fim?: string }) {
  let start = parseIsoDay(meta?.data_inicio);
  let end = parseIsoDay(meta?.data_fim);
  const flight = blocks.find((b) => b.type === "flight");
  if (flight) {
    start = start ?? parseIsoDay(flight.data?.resumo?.data_ida);
    end = end ?? parseIsoDay(flight.data?.resumo?.data_retorno);
  }
  return { start, end };
}

export function checkQuoteTimeline(
  blocks: TimelineBlock[],
  opts: { today?: Date; meta?: { data_inicio?: string; data_fim?: string } } = {},
): TimelineWarning[] {
  const today = opts.today ?? new Date();
  const todayIdx = dayIndex(today);
  const warnings: TimelineWarning[] = [];

  for (const b of blocks) {
    for (const { key, value } of blockDates(b)) {
      if (value == null || value === "") continue;
      const d = parseIsoDay(value);
      if (!d) {
        warnings.push({ kind: "invalid_date", blockId: b.id, message: `${b.label || b.type}: data "${value}" incompleta ou inválida (${key}). Confirme o ano.` });
        continue;
      }
      if (dayIndex(d) < todayIdx) {
        warnings.push({ kind: "past_date", blockId: b.id, message: `${b.label || b.type}: ${fmt(d)} já passou.` });
      }
    }
  }

  const hotels = blocks
    .filter((b) => b.type === "hotel")
    .map((b) => ({ b, ci: parseIsoDay(b.data?.check_in), co: parseIsoDay(b.data?.check_out) }))
    .filter((h) => h.ci && h.co) as { b: TimelineBlock; ci: Date; co: Date }[];

  for (const h of hotels) {
    if (dayIndex(h.co) <= dayIndex(h.ci)) {
      warnings.push({ kind: "checkout_before_checkin", blockId: h.b.id, message: `${h.b.label || "Hospedagem"}: check-out não é posterior ao check-in.` });
    }
  }

  const sorted = [...hotels].sort((a, b) => dayIndex(a.ci) - dayIndex(b.ci));
  for (let i = 1; i < sorted.length; i++) {
    if (dayIndex(sorted[i].ci) < dayIndex(sorted[i - 1].co)) {
      warnings.push({ kind: "hotel_overlap", blockId: sorted[i].b.id, message: `Hospedagens sobrepostas: ${sorted[i - 1].b.label || "hotel"} e ${sorted[i].b.label || "hotel"}.` });
    }
  }

  const { start, end } = tripRange(blocks, opts.meta);
  if (start && end && dayIndex(end) > dayIndex(start)) {
    const covered = new Set<number>();
    for (const h of hotels) for (let n = dayIndex(h.ci); n < dayIndex(h.co); n++) covered.add(n);
    const gaps: number[] = [];
    for (let n = dayIndex(start); n < dayIndex(end); n++) if (!covered.has(n)) gaps.push(n);
    if (gaps.length) {
      // agrupa noites consecutivas
      const ranges: [number, number][] = [];
      for (const g of gaps) {
        const last = ranges[ranges.length - 1];
        if (last && last[1] + 1 === g) last[1] = g; else ranges.push([g, g]);
      }
      for (const [a, z] of ranges) {
        const from = new Date(a * DAY), to = new Date((z + 1) * DAY);
        const f = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const nights = z - a + 1;
        warnings.push({ kind: "uncovered_nights", message: `${nights} noite(s) sem hospedagem: ${f(from)} a ${f(to)}.` });
      }
    }
  }

  return warnings;
}
