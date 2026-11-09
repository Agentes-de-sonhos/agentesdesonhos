import { hotelRefundLabel } from "@/lib/hotelRefundPolicy";

/** Tarifa alternativa do mesmo hotel (mesmas datas e apartamentos). */
export interface HotelExtraRate {
  id: string;
  label: string;
  meal_plan: string;
  refund_policy: string;
  free_cancellation_until: string;
  price: number;
}

export interface HotelRateView {
  id: string;
  label: string;
  meal_plan: string;
  refundLabel: string | null;
  refundable: boolean;
  price: number;
}

export const MAX_HOTEL_RATES = 4;
export const MAIN_RATE_ID = "main";

export const MEAL_PLAN_LABELS: Record<string, string> = {
  sem_refeicao: "Sem refeição",
  cafe: "Café da manhã",
  meia_pensao: "Meia pensão",
  pensao_completa: "Pensão completa",
  all_inclusive: "All Inclusive",
};

export function mealPlanLabel(v: string | undefined): string {
  return (v && MEAL_PLAN_LABELS[v]) || v || "";
}

export function sanitizeExtraRates(raw: unknown): HotelExtraRate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object")
    .slice(0, MAX_HOTEL_RATES - 1)
    .map((r: any, i) => ({
      id: String(r.id || `rate-${i + 1}`),
      label: String(r.label || ""),
      meal_plan: String(r.meal_plan || ""),
      refund_policy: String(r.refund_policy || ""),
      free_cancellation_until: r.refund_policy === "refundable" ? String(r.free_cancellation_until || "") : "",
      price: Math.max(0, Number(r.price) || 0),
    }));
}

/** Lista todas as tarifas (principal + extras). Vazia quando só existe uma. */
export function hotelRates(data: any, mainPrice: number): HotelRateView[] {
  const extras = sanitizeExtraRates(data?.extra_rates);
  if (!extras.length) return [];
  const main: HotelRateView = {
    id: MAIN_RATE_ID,
    label: String(data?.rate_label || "") || "Tarifa 1",
    meal_plan: String(data?.meal_plan || ""),
    refundLabel: hotelRefundLabel(data),
    refundable: data?.refund_policy === "refundable",
    price: Number(mainPrice) || 0,
  };
  return [
    main,
    ...extras.map((r, i) => ({
      id: r.id,
      label: r.label || `Tarifa ${i + 2}`,
      meal_plan: r.meal_plan,
      refundLabel: hotelRefundLabel(r),
      refundable: r.refund_policy === "refundable",
      price: r.price,
    })),
  ];
}

/* ---------- Seleção do cliente no orçamento público ---------- */
const KEY = "quote-hotel-rate-choice";
type Listener = () => void;
const listeners = new Set<Listener>();

function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function getHotelRateChoice(serviceId: string): string {
  return readAll()[serviceId] || MAIN_RATE_ID;
}

export function setHotelRateChoice(serviceId: string, rateId: string) {
  const all = readAll();
  all[serviceId] = rateId;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeHotelRateChoice(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Texto enviado à agência com as tarifas escolhidas pelo cliente. */
export function hotelRateChoiceNotes(
  services: Array<{ id: string; service_type: string; amount?: number; service_data: any }>,
  fmt: (v: number) => string,
): string {
  const lines: string[] = [];
  for (const s of services) {
    if (s.service_type !== "hotel") continue;
    const rates = hotelRates(s.service_data, Number(s.amount) || 0);
    if (!rates.length) continue;
    const chosen = rates.find((r) => r.id === getHotelRateChoice(s.id)) || rates[0];
    const parts = [chosen.label, mealPlanLabel(chosen.meal_plan), chosen.refundLabel, fmt(chosen.price)].filter(Boolean);
    lines.push(`Tarifa escolhida — ${s.service_data?.hotel_name || "Hotel"}: ${parts.join(" · ")}`);
  }
  return lines.join("\n");
}
