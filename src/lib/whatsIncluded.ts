/**
 * Compute the automatic "O que está incluso" list from a quote's services.
 * Returns plain strings; rendering layers map keywords -> icons.
 * Stays in sync with OrcamentoPublico smart-highlights logic.
 */
import {
  FALLBACK_INCLUDED_ICON_ID,
  iconIdFromLegacyKey,
  sanitizeIncludedIconId,
  type IncludedIconId,
} from "@/lib/includedIcons";

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
 * Item da lista. `icon` é a escolha manual (id da allowlist); quando ausente,
 * o ícone exibido vem da sugestão automática por palavra-chave.
 */
export interface WhatsIncludedItem {
  text: string;
  icon?: IncludedIconId;
}

/** Normaliza uma entrada persistida (string antiga ou objeto novo). */
export function normalizeWhatsIncludedEntry(raw: any): WhatsIncludedItem | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { text } : null;
  }
  if (raw && typeof raw === "object") {
    const text = String(raw.text ?? "").trim();
    if (!text) return null;
    const icon = sanitizeIncludedIconId(raw.icon);
    return icon ? { text, icon } : { text };
  }
  return null;
}

/** Itens personalizados persistidos, já normalizados (vazio se não houver). */
export function customWhatsIncludedItems(quote: any): WhatsIncludedItem[] {
  const custom = (quote as any)?.whats_included;
  if (!Array.isArray(custom)) return [];
  return custom.map(normalizeWhatsIncludedEntry).filter(Boolean) as WhatsIncludedItem[];
}

/** Lista final a renderizar: personalizada (se houver) ou automática. */
export function resolveWhatsIncludedItems(quote: any): WhatsIncludedItem[] {
  const custom = customWhatsIncludedItems(quote);
  if (custom.length > 0) return custom;
  return computeAutoWhatsIncluded(quote).map((text) => ({ text }));
}

/** Serializa para o banco: string simples quando não há ícone manual. */
export function serializeWhatsIncludedItems(items: WhatsIncludedItem[]): Array<string | { text: string; icon: string }> {
  return items
    .map((item) => ({ text: String(item.text ?? "").trim(), icon: sanitizeIncludedIconId(item.icon) }))
    .filter((item) => item.text.length > 0)
    .map((item) => (item.icon ? { text: item.text, icon: item.icon } : item.text));
}

/** Ícone efetivo do item: escolha manual ou sugestão automática. */
export function effectiveIncludedIconId(item: WhatsIncludedItem): IncludedIconId {
  return sanitizeIncludedIconId(item.icon) ?? autoIncludedIconId(item.text);
}

/** Sugestão automática (id da allowlist) para um texto. */
export function autoIncludedIconId(text: string): IncludedIconId {
  return iconIdFromLegacyKey(iconKeyForIncludedItem(text)) || FALLBACK_INCLUDED_ICON_ID;
}

/**
 * Returns the list to render — custom (if user edited) or auto-generated.
 * Mantido para consumidores que só precisam dos textos.
 */
export function resolveWhatsIncluded(quote: any): string[] {
  return resolveWhatsIncludedItems(quote).map((item) => item.text);
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
  const t = String(text ?? "").toLowerCase();
  if (/(hotel|hosped|pousada|resort|all inclusive)/.test(t)) return "hotel";
  if (/(voo|voos|aére|aere|passage|flight)/.test(t)) return "flight";
  if (/(carro|locaç|aluguel de carro|rent|veíc|veic)/.test(t)) return "car";
  if (/(transfer|transporte|traslad)/.test(t)) return "transfer";
  if (/(experiênc|experienc|passeio|tour|atra|ingresso|ticket)/.test(t)) return "attraction";
  if (/(seguro)/.test(t)) return "insurance";
  if (/(cruzeiro|navio|cruise)/.test(t)) return "cruise";
  return "sparkles";
}
