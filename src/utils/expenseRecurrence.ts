import type { ExpenseEntry } from "@/types/financial";

/**
 * Despesa projetada (pode ser a original ou uma ocorrência virtual de recorrência).
 * Mantém o mesmo formato de ExpenseEntry, com flags adicionais:
 *  - is_projection: true quando é uma instância virtual gerada (não persistida)
 *  - source_id: id da despesa-mãe (igual ao id quando é a original)
 *  - occurrence_index: 0 para a original; 1, 2, ... para repetições
 */
export type ProjectedExpense = ExpenseEntry & {
  is_projection?: boolean;
  source_id?: string;
  occurrence_index?: number;
};

/**
 * Parse "YYYY-MM-DD" garantindo timezone local (evita rolagem de UTC).
 */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Retorna a data da n-ésima ocorrência de uma despesa recorrente mensal,
 * preservando o dia original (com clamp para o último dia do mês quando
 * o mês destino não possui aquele dia, ex.: 31 em fev → 28/29).
 */
function shiftMonths(base: Date, monthsAhead: number): Date {
  const targetMonthIndex = base.getMonth() + monthsAhead;
  const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(base.getDate(), lastDay);
  return new Date(targetYear, targetMonth, day);
}

/**
 * Verifica se uma ocorrência (índice n, 0=original) ainda está dentro
 * dos limites de término configurados na despesa-mãe.
 */
function occurrenceIsAllowed(entry: ExpenseEntry, occurrenceIndex: number, occurrenceDate: Date): boolean {
  if (occurrenceIndex === 0) return true; // original sempre permitida
  const endType = (entry as any).recurrence_end_type || "indefinite";
  if (endType === "indefinite") return true;
  if (endType === "occurrences") {
    const max = Number((entry as any).recurrence_occurrences) || 0;
    // total = 1 (original) + (max-1) repetições; aceita índices 0..max-1
    return max > 0 ? occurrenceIndex < max : true;
  }
  if (endType === "until_date") {
    const endStr = (entry as any).recurrence_end_date as string | null;
    if (!endStr) return true;
    return occurrenceDate <= parseLocalDate(endStr);
  }
  return true;
}

/**
 * Projeta despesas para um intervalo [startISO, endISO] (datas locais YYYY-MM-DD).
 * - Despesas "variable" / não-recorrentes: aparecem apenas se entry_date estiver no intervalo.
 * - Despesas "fixed" + is_recurring: aparecem em todos os meses dentro do intervalo
 *   a partir de entry_date, respeitando recurrence_end_type/date/occurrences.
 */
export function projectExpensesInRange(
  expenses: ExpenseEntry[],
  startISO: string,
  endISO: string
): ProjectedExpense[] {
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  const result: ProjectedExpense[] = [];

  for (const e of expenses) {
    if (!e.entry_date) continue;
    const base = parseLocalDate(e.entry_date);
    const isRecurring = e.expense_type === "fixed" && !!e.is_recurring;

    if (!isRecurring) {
      if (base >= start && base <= end) {
        result.push({ ...e, is_projection: false, source_id: e.id, occurrence_index: 0 });
      }
      continue;
    }

    // Calcula primeira ocorrência ≥ start
    let monthsFromBase = 0;
    if (base < start) {
      monthsFromBase =
        (start.getFullYear() - base.getFullYear()) * 12 +
        (start.getMonth() - base.getMonth());
      // pode precisar ajustar se o dia ainda não chegou nesse mês
      if (shiftMonths(base, monthsFromBase) < start) monthsFromBase += 1;
    }

    // Itera enquanto a ocorrência cabe no range e respeita o término
    // (cap defensivo para evitar loops infinitos)
    const MAX_ITER = 600;
    for (let i = 0; i < MAX_ITER; i++) {
      const occIndex = monthsFromBase + i;
      const occDate = shiftMonths(base, occIndex);
      if (occDate > end) break;
      if (!occurrenceIsAllowed(e, occIndex, occDate)) break;
      const isOriginal = occIndex === 0;
      result.push({
        ...e,
        entry_date: toIsoLocal(occDate),
        id: isOriginal ? e.id : `${e.id}__occ${occIndex}`,
        is_projection: !isOriginal,
        source_id: e.id,
        occurrence_index: occIndex,
      });
    }
  }

  return result;
}

/** Conveniência: projeta despesas para um mês (1-12) específico. */
export function projectExpensesForMonth(
  expenses: ExpenseEntry[],
  year: number,
  month: number
): ProjectedExpense[] {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return projectExpensesInRange(expenses, start, end);
}