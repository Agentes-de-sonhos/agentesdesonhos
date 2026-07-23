/**
 * Central builder for WhatsApp-friendly public share messages
 * used by Orçamentos, Roteiros and Carteiras Digitais.
 *
 * IMPORTANT: never include prices, totals, installments or any
 * financial data in Orçamento messages, even when values are
 * visible in the public quote page.
 */

import { parseLocalDate } from "@/lib/dateParsing";

export type PublicShareType = "quote" | "itinerary" | "wallet";

export interface PublicShareTravelers {
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
}

export interface PublicShareMessageInput {
  type: PublicShareType;
  publicUrl: string;
  clientFirstName?: string | null;
  destination?: string | null;
  tripName?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  durationDays?: number | null;
  travelers?: PublicShareTravelers | null;
  /** Raw service type codes (e.g. 'flight','hotel','transfer'...). */
  serviceTypes?: string[] | null;
  /** Free-form highlights (used by itineraries). */
  highlights?: string[] | null;
  agencyName?: string | null;
  consultantName?: string | null;
}

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  // "YYYY-MM-DD" -> local midnight
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      return parseLocalDate(s.slice(0, 10));
    } catch {
      return null;
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatPeriod(startRaw?: string | Date | null, endRaw?: string | Date | null): string | null {
  const start = toDate(startRaw);
  const end = toDate(endRaw);
  if (!start && !end) return null;

  const fmtFull = (d: Date) => `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
  const fmtDay = (d: Date) => `${d.getDate()}`;
  const fmtDayMonth = (d: Date) => `${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;

  if (start && end) {
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${fmtDay(start)} a ${fmtDay(end)} de ${MONTHS_PT[end.getMonth()]} de ${end.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${fmtDayMonth(start)} a ${fmtDayMonth(end)} de ${end.getFullYear()}`;
    }
    return `${fmtFull(start)} a ${fmtFull(end)}`;
  }
  return fmtFull((start || end) as Date);
}

function computeDurationDays(
  startRaw?: string | Date | null,
  endRaw?: string | Date | null,
  explicit?: number | null,
): number | null {
  if (typeof explicit === "number" && explicit > 0) return Math.round(explicit);
  const start = toDate(startRaw);
  const end = toDate(endRaw);
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  const days = Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
  return days > 0 ? days : null;
}

function formatTravelers(t?: PublicShareTravelers | null): string | null {
  if (!t) return null;
  const adults = Number(t.adults) || 0;
  const children = Number(t.children) || 0;
  const infants = Number(t.infants) || 0;
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulto${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} criança${children === 1 ? "" : "s"}`);
  if (infants > 0) parts.push(`${infants} bebê${infants === 1 ? "" : "s"}`);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

// ---- Service type mapping ----

const QUOTE_SERVICE_LABELS: Record<string, string> = {
  flight: "passagem aérea",
  hotel: "hospedagem",
  transfer: "transfer",
  car_rental: "locação de veículo",
  attraction: "ingressos e passeios",
  insurance: "seguro viagem",
  cruise: "cruzeiro",
  train: "trem",
  other: "outros serviços",
};

const WALLET_SERVICE_META: Record<string, { emoji: string; label: string }> = {
  flight: { emoji: "✈️", label: "Passagens aéreas" },
  hotel: { emoji: "🏨", label: "Hospedagens" },
  transfer: { emoji: "🚐", label: "Transfers" },
  car_rental: { emoji: "🚗", label: "Locação de veículo" },
  attraction: { emoji: "🎟️", label: "Ingressos" },
  insurance: { emoji: "🛡️", label: "Seguro viagem" },
  cruise: { emoji: "🚢", label: "Cruzeiro" },
  train: { emoji: "🚆", label: "Trem" },
  tour: { emoji: "🗺️", label: "Passeios" },
  other: { emoji: "📄", label: "Outros serviços" },
};

function uniqueTypes(types?: string[] | null): string[] {
  if (!types || types.length === 0) return [];
  return Array.from(new Set(types.filter(Boolean)));
}

function formatQuoteServiceList(types: string[]): string | null {
  const labels = uniqueTypes(types)
    .map((t) => QUOTE_SERVICE_LABELS[t])
    .filter(Boolean) as string[];
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

function firstName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function limitHighlights(list?: string[] | null, max = 5): string[] {
  if (!list) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function joinNatural(list: string[]): string {
  if (list.length <= 1) return list.join("");
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

function greeting(clientFirstName?: string | null, emoji = "😊"): string {
  const name = firstName(clientFirstName);
  return name ? `Olá, ${name}! ${emoji}` : `Olá! ${emoji}`;
}

// ---- Builders ----

function buildQuoteMessage(input: PublicShareMessageInput): string {
  const lines: string[] = [];
  lines.push(greeting(input.clientFirstName, "😊"));
  lines.push("");

  const dest = (input.destination || "").trim();
  if (dest) {
    lines.push(`Preparei uma proposta personalizada para a sua viagem a *${dest}*.`);
  } else {
    lines.push("Preparei uma proposta de viagem personalizada para você.");
  }
  lines.push("");

  if (dest) lines.push(`📍 Destino: ${dest}`);
  const period = formatPeriod(input.startDate, input.endDate);
  if (period) lines.push(`📅 Período: ${period}`);
  const travelers = formatTravelers(input.travelers);
  if (travelers) lines.push(`👥 Viajantes: ${travelers}`);
  const services = formatQuoteServiceList(input.serviceTypes || []);
  if (services) lines.push(`🧳 Serviços incluídos: ${services}`);

  lines.push("");
  lines.push("Você pode acessar todos os detalhes da proposta pelo link abaixo:");
  lines.push("");
  lines.push(input.publicUrl);
  lines.push("");
  lines.push("Qualquer dúvida ou ajuste, estou à disposição! 😊");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildItineraryMessage(input: PublicShareMessageInput): string {
  const lines: string[] = [];
  lines.push(greeting(input.clientFirstName, "🌍"));
  lines.push("");

  const dest = (input.destination || "").trim();
  if (dest) {
    lines.push(`Seu roteiro personalizado para *${dest}* está pronto!`);
  } else {
    lines.push("Seu roteiro personalizado está pronto!");
  }
  lines.push("");

  if (dest) lines.push(`📍 Destino: ${dest}`);
  const period = formatPeriod(input.startDate, input.endDate);
  if (period) lines.push(`📅 Período: ${period}`);
  const duration = computeDurationDays(input.startDate, input.endDate, input.durationDays);
  if (duration) lines.push(`🗓️ Duração: ${duration} dia${duration === 1 ? "" : "s"}`);
  const highlights = limitHighlights(input.highlights, 5);
  if (highlights.length > 0) lines.push(`✨ Destaques: ${joinNatural(highlights)}`);

  lines.push("");
  lines.push("Acesse o roteiro completo com a programação organizada dia a dia:");
  lines.push("");
  lines.push(input.publicUrl);
  lines.push("");
  lines.push("Espero que você goste! Qualquer ajuste, é só me chamar. 😊");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildWalletMessage(input: PublicShareMessageInput): string {
  const lines: string[] = [];
  lines.push(greeting(input.clientFirstName, "✈️"));
  lines.push("");
  lines.push(
    "Sua Carteira Digital de Viagem está disponível. Nela você poderá consultar de forma prática as principais informações da sua viagem.",
  );
  lines.push("");

  const label = (input.tripName || input.destination || "").trim();
  if (label) lines.push(`📍 Viagem: ${label}`);
  const period = formatPeriod(input.startDate, input.endDate);
  if (period) lines.push(`📅 Período: ${period}`);

  const items = uniqueTypes(input.serviceTypes || [])
    .map((t) => WALLET_SERVICE_META[t])
    .filter(Boolean) as { emoji: string; label: string }[];

  if (items.length > 0) {
    lines.push("");
    lines.push("Documentos e serviços disponíveis:");
    for (const item of items) {
      lines.push(`${item.emoji} ${item.label}`);
    }
  }

  lines.push("");
  lines.push("Acesse sua carteira pelo link:");
  lines.push("");
  lines.push(input.publicUrl);
  lines.push("");
  lines.push("Recomendo salvar este link para consultar durante toda a viagem. 😊");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Build a ready-to-paste WhatsApp message for the given public link.
 * Empty fields are omitted; quotes never expose prices.
 */
export function buildPublicShareMessage(input: PublicShareMessageInput): string {
  switch (input.type) {
    case "quote":
      return buildQuoteMessage(input);
    case "itinerary":
      return buildItineraryMessage(input);
    case "wallet":
      return buildWalletMessage(input);
    default:
      return input.publicUrl;
  }
}

/** Suggested share title (used by navigator.share when supported). */
export function getPublicShareTitle(type: PublicShareType): string {
  switch (type) {
    case "quote":
      return "Sua proposta de viagem";
    case "itinerary":
      return "Seu roteiro de viagem";
    case "wallet":
      return "Sua Carteira Digital de Viagem";
  }
}

// ---- Clipboard + share helpers ----

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    if (typeof document === "undefined") return false;
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-1000px";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return !!ok;
  } catch {
    return false;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as any).share === "function";
}

export type NativeShareResult = "shared" | "cancelled" | "unsupported" | "error";

/**
 * Wraps navigator.share. To prevent apps like WhatsApp from duplicating the
 * link (once from `text`, once from `url`), we share only the `text` payload —
 * which already contains the URL at the end — and intentionally omit `url`.
 *
 * Returns "cancelled" when the user dismisses the share sheet (AbortError),
 * so callers can silently ignore it without showing an error toast.
 */
export async function nativeShare(payload: { title?: string; text?: string; url?: string }): Promise<NativeShareResult> {
  if (!canNativeShare()) return "unsupported";
  // Merge url into text if missing, then drop url to avoid duplication.
  let text = payload.text ?? "";
  if (!text && payload.url) text = payload.url;
  else if (text && payload.url && !text.includes(payload.url)) {
    text = `${text}\n${payload.url}`;
  }
  try {
    await (navigator as any).share({ title: payload.title, text });
    return "shared";
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "AbortError" || /cancel|abort/i.test(String(err?.message || ""))) {
      return "cancelled";
    }
    return "error";
  }
}