/**
 * Regras de status e do resumo mensal de entradas.
 *
 * Fonte única usada pela Visão Geral da Gestão Financeira (SmartDashboard) e
 * pelo bloco "Resumo financeiro do mês" do painel white label. Os dois lugares
 * leem os mesmos registros (`income_entries` via `useFinancial`) e aplicam
 * exatamente estas regras — nenhum recálculo paralelo.
 */

export function getIncomeStatus(entry: any): string {
  const rawStatus = String(entry?.status || "received").toLowerCase();
  if (["received", "recebido"].includes(rawStatus)) return "received";
  if (["pending", "a_receber", "prevista", "previsao_criada"].includes(rawStatus)) return "pending";
  return rawStatus;
}

export interface MonthIncomeSummary {
  /** Entradas do mês já recebidas. */
  received: number;
  /** Entradas do mês previstas e ainda não recebidas. */
  pending: number;
  /** Entradas pendentes (de qualquer mês) com data prevista já vencida. */
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
  const periodStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const periodEnd =
    viewMonth === 12
      ? `${viewYear + 1}-01-01`
      : `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;

  const periodIncome = (incomeEntries || []).filter(
    (e: any) => e.entry_date >= periodStart && e.entry_date < periodEnd,
  );

  const received = periodIncome
    .filter((e: any) => getIncomeStatus(e) === "received")
    .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const pending = periodIncome
    .filter((e: any) => getIncomeStatus(e) === "pending")
    .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const overdueEntries = (incomeEntries || []).filter(
    (e: any) => getIncomeStatus(e) === "pending" && e.expected_date && e.expected_date < today,
  );

  return {
    received,
    pending,
    overdue: overdueEntries.reduce((s: number, e: any) => s + Number(e.amount), 0),
    overdueCount: overdueEntries.length,
  };
}
