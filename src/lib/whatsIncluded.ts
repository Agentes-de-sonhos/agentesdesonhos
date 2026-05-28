/**
 * Compute the automatic "O que está incluso" list from a quote's services.
 * Returns plain strings; rendering layers map keywords -> icons.
 * Stays in sync with OrcamentoPublico smart-highlights logic.
 */
export function computeAutoWhatsIncluded(quote: any): string[] {
  const services: any[] = quote?.services || [];
  const types = new Set(services.map((s) => s.service_type));
  const out: string[] = [];

  const hotel = services.find((s) => s.service_type === "hotel");
  if (hotel?.service_data) {
    const meal = String(hotel.service_data.meal_plan || "").toLowerCase();
    const ai = meal.includes("all") || meal.includes("inclu");
    out.push(
      `${hotel.service_data.hotel_name || "Hospedagem selecionada"}${ai ? " • All Inclusive" : ""}`
    );
  }

  const flight = services.find((s) => s.service_type === "flight");
  if (flight?.service_data) {
    out.push(
      `Voos${flight.service_data.origin_city ? ` saindo de ${flight.service_data.origin_city}` : ""}`
    );
  }

  if (types.has("car_rental")) out.push("Carro à disposição");
  if (types.has("transfer")) out.push("Transfers privativos inclusos");
  if (types.has("attraction")) out.push("Experiências e passeios selecionados");
  if (types.has("insurance")) out.push("Seguro viagem incluso");
  if (types.has("cruise")) out.push("Cruzeiro reservado");

  if (out.length === 0) out.push("Roteiro personalizado pela sua agência");
  return out;
}

/**
 * Returns the list to render — custom (if user edited) or auto-generated.
 */
export function resolveWhatsIncluded(quote: any): string[] {
  const custom = (quote as any)?.whats_included;
  if (Array.isArray(custom) && custom.length > 0) {
    return custom.map((x) => String(x)).filter((x) => x.trim().length > 0);
  }
  return computeAutoWhatsIncluded(quote);
}

/**
 * Pick an icon key for a given text via keyword match.
 * Consumers map the key to their icon library (lucide for web, emoji for PDF).
 */
export type WhatsIncludedIconKey =
  | "hotel"
  | "flight"
  | "car"
  | "transfer"
  | "attraction"
  | "insurance"
  | "cruise"
  | "sparkles";

export function iconKeyForIncludedItem(text: string): WhatsIncludedIconKey {
  const t = text.toLowerCase();
  if (/(hotel|hosped|pousada|resort|all inclusive)/.test(t)) return "hotel";
  if (/(voo|voos|aére|aere|passage|flight)/.test(t)) return "flight";
  if (/(carro|locaç|aluguel de carro|rent|veíc|veic)/.test(t)) return "car";
  if (/(transfer|transporte|traslad)/.test(t)) return "transfer";
  if (/(experiênc|experienc|passeio|tour|atra|ingresso|ticket)/.test(t)) return "attraction";
  if (/(seguro)/.test(t)) return "insurance";
  if (/(cruzeiro|navio|cruise)/.test(t)) return "cruise";
  return "sparkles";
}