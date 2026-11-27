/** Modelo declarativo único para circuitos pela Europa. Cadastre um novo circuito
 * criando um arquivo de dados e registrando-o em `src/lib/circuits/index.ts`. */
export type CircuitInclusionIcon = "hotel" | "tours" | "meals" | "bus" | "transfer" | "guide" | "boat" | "flight";

export interface CircuitDay {
  day: number;
  weekday: string;
  title: string;
  meals?: string[];
  description: string;
  /** City where this day ends with accommodation; absent on the final day. */
  overnightCity?: string;
}

export interface CircuitTour {
  slug: string;
  /** Perfis de site que podem abrir o circuito; ausente = todos. */
  profiles?: string[];
  /** Opt-in to the enhanced presentation and existing agency request flow. */
  enhancedPresentation?: boolean;
  badge: string;
  title: string;
  code?: string;
  operator?: string;
  duration: string;
  countries: string[];
  cities: string[];
  heroImage: string;
  heroMobileImage?: string;
  heroImageSize?: { width: number; height: number };
  heroAlt: string;
  heroCaption?: string;
  pdfUrl?: string;
  summary: string;
  currency: "EUR" | "USD" | "BRL";
  fromPrice: number;
  /** Estimativa de parcelas exibida quando há conversão válida em reais. */
  brlInstallments?: number;
  /** Entrada separada, como porcentagem do total em reais, antes de parcelar o saldo. */
  brlDownPaymentPercent?: number;
  singleSupplement?: number;
  priceNote: string;
  inclusions: { icon: CircuitInclusionIcon; title: string; text: string }[];
  highlights: string[];
  hotels: { city: string; overnightCity?: string; options: string[] }[];
  hotelsNote?: string;
  itinerary: CircuitDay[];
  /** ISO dates (YYYY-MM-DD) of departures with an exclusive Brazilian guide. */
  brazilianGuideDepartures?: string[];
  departures: { month: string; days: number[] }[];
  departuresNote?: string;
  departuresTitle?: string;
  departurePrompt?: string;
  notes?: { title: string; text: string }[];
  faq: { q: string; a: string }[];
}
