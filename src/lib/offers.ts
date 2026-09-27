/**
 * Regras puras do módulo Ofertas (sem rede) — usadas pelo painel e pelo site.
 * O banco continua sendo a fonte de verdade de estados, preço e isolamento.
 */

export type OfferStatus = "draft" | "scheduled" | "published" | "paused" | "expired" | "ended";
export type OfferPriceMode = "fixed" | "on_request";

export interface OfferIncludedService {
  type: string;
  name?: string | null;
  detail?: string | null;
}

/** Cópia pública sanitizada devolvida pelas funções públicas. */
export interface PublicOffer {
  slug: string;
  status: "published" | "expired" | "ended" | "paused" | "not_found";
  title?: string;
  description?: string | null;
  cover_url?: string | null;
  gallery?: string[];
  destination?: string | null;
  category?: string;
  service_types?: string[];
  included_services?: OfferIncludedService[];
  travel_start?: string | null;
  travel_end?: string | null;
  nights?: number | null;
  price_mode?: OfferPriceMode;
  price_from?: number | null;
  currency?: string;
  price_note?: string | null;
  compare_at_price?: number | null;
  payment_conditions?: string | null;
  publish_at?: string | null;
  expires_at?: string | null;
}

/** Campos estruturais sincronizados com o orçamento (podem ser personalizados). */
export const STRUCTURAL_FIELDS = [
  "destination",
  "travel_start",
  "travel_end",
  "nights",
  "included_services",
  "service_types",
  "price_from",
  "currency",
  "payment_conditions",
] as const;

export const STRUCTURAL_FIELD_LABELS: Record<string, string> = {
  destination: "Destino",
  travel_start: "Data de ida",
  travel_end: "Data de volta",
  nights: "Noites",
  included_services: "Serviços inclusos",
  service_types: "Tipos de serviço",
  price_from: "Preço",
  currency: "Moeda",
  payment_conditions: "Condições de pagamento",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  published: "Ativa",
  paused: "Pausada",
  expired: "Expirada",
  ended: "Encerrada",
};

export const OFFER_CATEGORIES = ["Pacotes", "Cruzeiros", "Resorts", "Hospedagem", "Aéreo", "Ingressos", "Experiências"];

export const OFFER_CONSENT_VERSION = "oferta-v1";

export const OFFER_PRICE_NOTICE =
  "Os valores e a disponibilidade dos serviços desta oferta podem sofrer variações até a confirmação da reserva. Nossa equipe analisará sua solicitação e retornará com as condições atualizadas.";

/** Estado efetivo para exibição: publicada vencida conta como expirada antes do job. */
export function effectiveOfferStatus(
  o: { status: OfferStatus; publish_at?: string | null; expires_at?: string | null },
  now: Date = new Date(),
): OfferStatus {
  const exp = o.expires_at ? new Date(o.expires_at) : null;
  const pub = o.publish_at ? new Date(o.publish_at) : null;
  if ((o.status === "published" || o.status === "scheduled") && exp && exp < now) return "expired";
  if (o.status === "scheduled" && pub && pub <= now) return "published";
  return o.status;
}

export type OfferPanelFilter = "active" | "scheduled" | "paused" | "draft" | "history";

export function offerMatchesPanelFilter(status: OfferStatus, filter: OfferPanelFilter): boolean {
  switch (filter) {
    case "active":
      return status === "published";
    case "scheduled":
      return status === "scheduled";
    case "paused":
      return status === "paused";
    case "draft":
      return status === "draft";
    case "history":
      return status === "expired" || status === "ended";
  }
}

/** Nunca devolve "R$ 0,00": sem preço válido vira "Consulte". */
export function formatOfferPrice(price: number | null | undefined, currency = "BRL", mode: OfferPriceMode = "fixed"): string {
  if (mode === "on_request" || price == null || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return "Consulte";
  }
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(Number(price));
  } catch {
    return `${currency} ${Number(price).toFixed(2)}`;
  }
}

/** "Promoção" só aparece com valor anterior comprovadamente maior. */
export function isProvenPromotion(o: Pick<PublicOffer, "price_mode" | "price_from" | "compare_at_price">): boolean {
  return (
    o.price_mode !== "on_request" &&
    Number(o.price_from) > 0 &&
    Number(o.compare_at_price) > Number(o.price_from)
  );
}

/** "YYYY-MM-DD" → Date local (sem deslocamento de fuso). */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthKey(date?: string | null): string | null {
  const d = parseLocalDate(date);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : null;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const name = MONTHS[(m || 1) - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

export function formatOfferPeriod(start?: string | null, end?: string | null): string | null {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  if (s && e) return `${fmt(s)} a ${fmt(e)}`;
  if (s) return `A partir de ${fmt(s)}`;
  return null;
}

export interface OfferFilters {
  category?: string | null;
  destination?: string | null;
  month?: string | null;
}

/** Opções dos filtros vêm só das ofertas ativas recebidas (dinâmicas). */
export function offerFilterOptions(offers: PublicOffer[]) {
  const categories = new Set<string>();
  const destinations = new Set<string>();
  const months = new Set<string>();
  for (const o of offers) {
    if (o.category) categories.add(o.category);
    if (o.destination?.trim()) destinations.add(o.destination.trim());
    const mk = monthKey(o.travel_start);
    if (mk) months.add(mk);
  }
  const sort = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return {
    categories: [...categories].sort(sort),
    destinations: [...destinations].sort(sort),
    months: [...months].sort(),
  };
}

export function filterPublicOffers(offers: PublicOffer[], f: OfferFilters): PublicOffer[] {
  return offers.filter(
    (o) =>
      (!f.category || o.category === f.category) &&
      (!f.destination || (o.destination ?? "").trim() === f.destination) &&
      (!f.month || monthKey(o.travel_start) === f.month),
  );
}

/** Dados principais da oferta encerrada levados para a Central de Solicitações. */
export function similarQuotePrefill(o: PublicOffer, today: Date = new Date()): Record<string, string> {
  const out: Record<string, string> = {};
  if (o.destination) out.destinos = o.destination;
  const start = parseLocalDate(o.travel_start);
  if (start && start > today) out.data = o.travel_start!.slice(0, 10);
  if (o.nights && o.nights > 0) out.duracao = String(o.nights + 1);
  if (o.service_types?.length) out.servicos_desejados = o.service_types.join(", ");
  return out;
}

export interface OfferRequestForm {
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  adults: string;
  children: string;
  departure_city: string;
  notes: string;
  consent: boolean;
}

export const EMPTY_OFFER_REQUEST: OfferRequestForm = {
  lead_name: "",
  lead_phone: "",
  lead_email: "",
  adults: "2",
  children: "0",
  departure_city: "",
  notes: "",
  consent: false,
};

export function validateOfferRequest(v: OfferRequestForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.lead_name.trim().length < 2) e.lead_name = "Informe seu nome completo.";
  const phone = v.lead_phone.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 15) e.lead_phone = "Informe um WhatsApp válido com DDD.";
  if (v.lead_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.lead_email.trim())) e.lead_email = "Informe um e-mail válido.";
  const a = Number(v.adults);
  if (!Number.isInteger(a) || a < 1 || a > 30) e.adults = "Informe a quantidade de adultos.";
  const c = Number(v.children);
  if (v.children === "" || !Number.isInteger(c) || c < 0 || c > 20) e.children = "Informe a quantidade de crianças.";
  if (!v.departure_city.trim()) e.departure_city = "Informe a cidade de saída.";
  if (!v.consent) e.consent = "É necessário aceitar a Política de Privacidade.";
  return e;
}
