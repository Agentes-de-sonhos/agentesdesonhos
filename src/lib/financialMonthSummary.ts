/**
 * Regras de status e do resumo mensal de entradas.
 *
 * Fonte única usada pela Visão Geral da Gestão Financeira (SmartDashboard) e
 * pelo bloco "Resumo financeiro do mês" do painel white label. Os dois lugares
 * leem os mesmos registros (`income_entries` via `useFinancial`) e aplicam
 * exatamente estas regras — nenhum recálculo paralelo.
 *
 * Entradas automáticas (`source = 'auto'`, vinculadas por `sale_product_id`)
 * são mantidas pelo banco a partir das comissões (tela de Comissões é a fonte
 * de verdade). Elas podem estar pendentes, parcialmente recebidas, recebidas ou
 * canceladas. Entradas manuais e registros legados continuam funcionando.
 */

export function getIncomeStatus(entry: any): string {
  const rawStatus = String(entry?.status || "received").toLowerCase();
  if (["received", "recebido"].includes(rawStatus)) return "received";
  if (["partial", "recebido_parcial", "parcial"].includes(rawStatus)) return "partial";
  if (["cancelled", "canceled", "cancelado"].includes(rawStatus)) return "cancelled";
  if (["pending", "a_receber", "prevista", "previsao_criada"].includes(rawStatus)) return "pending";
  return rawStatus;
}

/** Valor total da entrada (comissão prevista, no caso das automáticas). */
export function getIncomeTotal(entry: any): number {
  return Number(entry?.amount) || 0;
}

/** Valor efetivamente recebido (por competência da data real de recebimento). */
export function getIncomeReceivedAmount(entry: any): number {
  const status = getIncomeStatus(entry);
  if (status === "cancelled") return 0;
  const total = getIncomeTotal(entry);
  if (status === "received") return total;
  if (status === "partial") {
    return Math.min(Math.max(Number(entry?.received_amount) || 0, 0), total);
  }
  // Registros legados podem ter received_amount sem status parcial.
  return Math.min(Math.max(Number(entry?.received_amount) || 0, 0), total);
}

/** Saldo ainda a receber. Comissões canceladas não geram saldo. */
export function getIncomeRemainingAmount(entry: any): number {
  if (getIncomeStatus(entry) === "cancelled") return 0;
  return Math.max(getIncomeTotal(entry) - getIncomeReceivedAmount(entry), 0);
}

/** Data de competência do valor recebido. */
export function getIncomeReceivedDate(entry: any): string | null {
  return entry?.received_date || entry?.entry_date || null;
}

/** Data de competência do saldo pendente. */
export function getIncomeDueDate(entry: any): string | null {
  return entry?.expected_date || entry?.entry_date || null;
}

export function isIncomeOverdue(entry: any, today: string): boolean {
  const due = getIncomeDueDate(entry);
  return getIncomeRemainingAmount(entry) > 0 && !!due && due < today;
}

/** Entrada automática mantida pela tela de Comissões. */
export function isAutoIncomeEntry(entry: any): boolean {
  return entry?.source === "auto" && !!entry?.sale_product_id;
}

function isInMonthStr(date: string | null, month: number, year: number): boolean {
  if (!date) return false;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return String(date).slice(0, 7) === prefix;
}

export interface MonthIncomeSummary {
  /** Valores recebidos no mês (pela data real de recebimento). */
  received: number;
  /** Saldo pendente com data prevista no mês. */
  pending: number;
  /** Saldo pendente (de qualquer mês) com data prevista já vencida. */
  overdue: number;
  /** Quantidade de pagamentos vencidos. */
  overdueCount: number;
}

/**
 * @param incomeEntries todas as entradas do usuário (mesma consulta do financeiro)
 * @param viewMonth mês exibido (1-12)
 * @param viewYear ano exibido
 * @param today data de hoje em "YYYY-MM-DD"
 */
export function computeMonthIncomeSummary(
  incomeEntries: any[],
  viewMonth: number,
  viewYear: number,
  today: string,
): MonthIncomeSummary {
  const entries = (incomeEntries || []).filter(e => getIncomeStatus(e) !== "cancelled");

  const received = entries
    .filter(e => isInMonthStr(getIncomeReceivedDate(e), viewMonth, viewYear))
    .reduce((s, e) => s + getIncomeReceivedAmount(e), 0);

  const pending = entries
    .filter(e => isInMonthStr(getIncomeDueDate(e), viewMonth, viewYear))
    .reduce((s, e) => s + getIncomeRemainingAmount(e), 0);

  const overdueEntries = entries.filter(e => isIncomeOverdue(e, today));

  return {
    received,
    pending,
    overdue: overdueEntries.reduce((s, e) => s + getIncomeRemainingAmount(e), 0),
    overdueCount: overdueEntries.length,
  };
}
