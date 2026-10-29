export interface ExchangeRate {
  code: string;
  symbol: string;
  rate: number;
  date?: string;
  variation?: number;
}

/** Same public commercial-rate provider used by the dashboard. */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return Promise.all((["USD", "EUR"] as const).map(async (code) => {
    const response = await fetch(`https://api.frankfurter.dev/v1/latest?from=${code}&to=BRL`);
    if (!response.ok) throw new Error("Cotação indisponível");
    const data = await response.json();
    const rate = data?.rates?.BRL;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) throw new Error("Cotação inválida");
    return { code, symbol: code === "EUR" ? "€" : "$", rate, date: data.date };
  }));
}