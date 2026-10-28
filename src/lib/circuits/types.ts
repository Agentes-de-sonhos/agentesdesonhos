/** Modelo declarativo único para circuitos rodoviários. Cadastre um novo circuito
 * criando um arquivo de dados e registrando-o em `src/lib/circuits/index.ts`. */
export type CircuitInclusionIcon = "hotel" | "tours" | "meals" | "bus" | "transfer" | "guide";

export interface CircuitDay {
  day: number;
  weekday: string;
  title: string;
  meals?: string[];
  description: string;
}

export interface CircuitTour {
  slug: string;
  badge: string;
  title: string;
  code?: string;
  operator?: string;
  duration: string;
  countries: string[];
  cities: string[];
  heroImage: string;
  heroAlt: string;
  summary: string;
  currency: "EUR" | "USD" | "BRL";
  fromPrice: number;
  singleSupplement?: number;
  priceNote: string;
  inclusions: { icon: CircuitInclusionIcon; title: string; text: string }[];
  highlights: string[];
  hotels: { city: string; options: string[] }[];
  hotelsNote?: string;
  itinerary: CircuitDay[];
  departures: { month: string; days: number[] }[];
  departuresNote?: string;
  notes?: { title: string; text: string }[];
  faq: { q: string; a: string }[];
}
