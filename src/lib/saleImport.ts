import type { ProductType, SaleProductFormData } from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";

export type SourceKind = "wallet" | "quote";

export interface RawService {
  id: string;
  service_type?: string | null;
  service_data?: Record<string, any> | null;
  amount?: number | null;
  description?: string | null;
  option_label?: string | null;
  order_index?: number | null;
}

export interface NormalizedService {
  id: string;
  kind: SourceKind;
  productType: ProductType;
  title: string;
  supplierName: string;
  operatorId: string | null;
  price: number;
  startDate: string | null;
  endDate: string | null;
  optionLabel: string | null;
  identity: string;
  raw: RawService;
}

export type PairKind = "both" | "wallet_only" | "quote_only";

export interface ServicePair {
  key: string;
  kind: PairKind;
  productType: ProductType;
  wallet: NormalizedService | null;
  quote: NormalizedService | null;
  /** 1 = strong identity match, 0.6 = type+date, 0.3 = type only */
  confidence: number;
}

export interface Divergence {
  key: string;
  label: string;
  field: "price" | "date" | "missing";
  walletValue: string;
  quoteValue: string;
}

/** Precedence rules: wallet is the source of truth for operational detail,
 *  quote is the source of truth for commercial values. */
export interface Precedence {
  details: SourceKind;
  values: SourceKind;
}

export const DEFAULT_PRECEDENCE: Precedence = { details: "wallet", values: "quote" };

// ---------------- mapping ----------------

export function mapServiceTypeToProduct(t?: string | null): ProductType {
  switch ((t || "").toLowerCase()) {
    case "flight": return "aereo";
    case "hotel": return "hotel";
    case "car_rental": return "locacao";
    case "transfer": return "transfer";
    case "attraction": return "atracao";
    case "insurance": return "seguro";
    case "cruise": return "cruzeiro";
    default: return "outro";
  }
}

const TITLE_KEYS = [
  "title", "name", "hotel_name", "cruise_name", "attraction_name", "venue_name",
  "transfer_name", "car_model", "rental_company", "insurance_name", "provider",
  "airline", "description",
];

const START_KEYS = [
  "check_in", "checkin_date", "check_in_date", "start_date", "departure_date",
  "pickup_date", "date", "entry_date", "embark_date", "boarding_date",
];

const END_KEYS = [
  "check_out", "checkout_date", "check_out_date", "end_date", "return_date",
  "dropoff_date", "disembark_date",
];

const PRICE_KEYS = ["total_price", "total", "price", "value", "amount", "total_amount"];

function firstString(data: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    const v = data?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function firstNumber(data: Record<string, any>, keys: string[]): number {
  for (const k of keys) {
    const v = Number(data?.[k]);
    if (Number.isFinite(v) && v !== 0) return v;
  }
  return 0;
}

/** Normalizes a date-ish value to YYYY-MM-DD without timezone drift. */
export function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export function slugify(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Stable-ish identity used to match the same service across sources. */
export function serviceIdentity(productType: ProductType, data: Record<string, any>, title: string): string {
  const parts: string[] = [productType];
  const strong =
    firstString(data, ["flight_number", "reservation_code", "confirmation_code", "ticket_code", "policy_number"]);
  if (strong) {
    parts.push(slugify(strong));
    return parts.join("|");
  }
  parts.push(slugify(title).split(" ").slice(0, 4).join(" "));
  return parts.join("|");
}

export function normalizeService(raw: RawService, kind: SourceKind): NormalizedService {
  const data = raw.service_data || {};
  const productType = mapServiceTypeToProduct(raw.service_type);
  const title =
    firstString(data, TITLE_KEYS) ||
    (raw.description || "").trim() ||
    (raw.option_label || "").trim() ||
    PRODUCT_TYPES[productType];
  const price = kind === "quote" ? Number(raw.amount) || 0 : firstNumber(data, PRICE_KEYS);
  return {
    id: raw.id,
    kind,
    productType,
    title,
    supplierName: (data.supplier_name || data.operator_name || "") as string,
    operatorId: (data.supplier_operator_id as string) || null,
    price,
    startDate: normalizeDate(firstString(data, START_KEYS)),
    endDate: normalizeDate(firstString(data, END_KEYS)),
    optionLabel: raw.option_label || null,
    identity: serviceIdentity(productType, data, title),
    raw,
  };
}

// ---------------- matching ----------------

function scorePair(a: NormalizedService, b: NormalizedService): number {
  if (a.productType !== b.productType) return 0;
  if (a.identity === b.identity) return 1;
  const sameTitle = slugify(a.title).slice(0, 12) === slugify(b.title).slice(0, 12) && !!a.title;
  const sameStart = !!a.startDate && a.startDate === b.startDate;
  if (sameTitle && sameStart) return 0.9;
  if (sameTitle) return 0.7;
  if (sameStart) return 0.6;
  return 0.3;
}

/**
 * Greedy best-score matching between wallet and quote services.
 * Only pairs with score >= 0.6 are considered the same service.
 */
export function matchServices(wallet: NormalizedService[], quote: NormalizedService[]): ServicePair[] {
  const pairs: ServicePair[] = [];
  const usedQuote = new Set<string>();

  const candidates: { w: NormalizedService; q: NormalizedService; score: number }[] = [];
  wallet.forEach((w) => quote.forEach((q) => {
    const score = scorePair(w, q);
    if (score >= 0.6) candidates.push({ w, q, score });
  }));
  candidates.sort((a, b) => b.score - a.score);

  const usedWallet = new Set<string>();
  candidates.forEach(({ w, q, score }) => {
    if (usedWallet.has(w.id) || usedQuote.has(q.id)) return;
    usedWallet.add(w.id);
    usedQuote.add(q.id);
    pairs.push({ key: `${w.id}:${q.id}`, kind: "both", productType: w.productType, wallet: w, quote: q, confidence: score });
  });

  wallet.forEach((w) => {
    if (usedWallet.has(w.id)) return;
    pairs.push({ key: w.id, kind: "wallet_only", productType: w.productType, wallet: w, quote: null, confidence: 1 });
  });
  quote.forEach((q) => {
    if (usedQuote.has(q.id)) return;
    pairs.push({ key: q.id, kind: "quote_only", productType: q.productType, wallet: null, quote: q, confidence: 1 });
  });

  return pairs;
}

// ---------------- divergences ----------------

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function detectDivergences(pairs: ServicePair[]): Divergence[] {
  const out: Divergence[] = [];
  pairs.forEach((p) => {
    const label = p.wallet?.title || p.quote?.title || "Serviço";
    if (p.kind === "both" && p.wallet && p.quote) {
      if (p.wallet.price > 0 && p.quote.price > 0 && Math.abs(p.wallet.price - p.quote.price) > 0.01) {
        out.push({ key: p.key, label, field: "price", walletValue: fmtBRL(p.wallet.price), quoteValue: fmtBRL(p.quote.price) });
      }
      if (p.wallet.startDate && p.quote.startDate && p.wallet.startDate !== p.quote.startDate) {
        out.push({ key: p.key, label, field: "date", walletValue: p.wallet.startDate, quoteValue: p.quote.startDate });
      }
    } else if (p.kind === "wallet_only") {
      out.push({ key: p.key, label, field: "missing", walletValue: "Presente", quoteValue: "Ausente" });
    } else if (p.kind === "quote_only") {
      out.push({ key: p.key, label, field: "missing", walletValue: "Ausente", quoteValue: "Presente" });
    }
  });
  return out;
}

// ---------------- draft building ----------------

export interface DraftFromPair extends SaleProductFormData {
  _tempId: string;
  source_kind: SourceKind | "mixed";
  source_service_id: string | null;
  source_provenance: Record<string, unknown>;
}

export function buildDraftFromPair(
  pair: ServicePair,
  precedence: Precedence = DEFAULT_PRECEDENCE,
  base?: Partial<SaleProductFormData>,
): DraftFromPair {
  const detailSource =
    (precedence.details === "wallet" ? pair.wallet : pair.quote) || pair.wallet || pair.quote!;
  const valueSource =
    (precedence.values === "quote" ? pair.quote : pair.wallet) || pair.quote || pair.wallet!;

  const price = valueSource.price > 0 ? valueSource.price : (detailSource.price || 0);

  return {
    product_type: detailSource.productType,
    description: detailSource.title || PRODUCT_TYPES[detailSource.productType],
    sale_price: price,
    cost_price: 0,
    non_commissionable_taxes: 0,
    commission_type: "percentage",
    commission_value: 0,
    supplier_name: detailSource.supplierName || valueSource.supplierName || "",
    operator_id: detailSource.operatorId || valueSource.operatorId || null,
    payment_rule: "after_sale",
    payment_days: 30,
    requires_invoice: false,
    invoice_status: "a_emitir",
    ...base,
    _tempId: pair.key,
    source_kind: pair.kind === "both" ? "mixed" : detailSource.kind,
    source_service_id: detailSource.id,
    source_provenance: {
      pair_kind: pair.kind,
      confidence: pair.confidence,
      details_from: detailSource.kind,
      values_from: valueSource.kind,
      wallet_service_id: pair.wallet?.id || null,
      quote_service_id: pair.quote?.id || null,
    },
  };
}

/** Deterministic fingerprint so the same bundle can't be imported twice. */
export function buildImportFingerprint(input: {
  opportunityId?: string | null;
  tripId?: string | null;
  quoteId?: string | null;
  operationId?: string | null;
}): string {
  return [
    input.operationId || "-",
    input.opportunityId || "-",
    input.tripId || "-",
    input.quoteId || "-",
  ].join(":");
}