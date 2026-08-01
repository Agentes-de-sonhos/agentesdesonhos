// Shared contract between the agency configuration panel and the public
// conversational lead form. Keeps defaults, labels and summary building in one
// place so both sides always agree.
import { DEFAULT_OFFICE_HOURS, DEFAULT_TIMEZONE, normalizeOfficeHours, type OfficeHours } from "@/lib/officeHours";

export const CONSENT_VERSION = "v1";

export const CONSENT_TEXT =
  "Autorizo o contato desta agência pelos dados informados e o uso dessas informações para elaborar minha proposta de viagem.";

export const DEFAULT_BRAND_COLOR = "#059669";

export const DEFAULT_WELCOME_MESSAGE =
  "Olá! 👋 Que bom ter você aqui. Vou te ajudar a planejar sua próxima viagem dos sonhos!";

export const DEFAULT_CLOSING_MESSAGE =
  "Prontinho! Recebi todas as informações e já vou preparar as melhores opções para você. 🎉";

/** Public configuration returned by the get_public_lead_form RPC. */
export interface PublicLeadForm {
  form_id: string;
  token: string;
  is_test: boolean;
  headline: string | null;
  welcome_message: string | null;
  closing_message: string | null;
  brand_color: string | null;
  agency_name: string | null;
  logo_url: string | null;
  consultant_name: string | null;
  consultant_role: string | null;
  consultant_photo_url: string | null;
  whatsapp: string | null;
  city: string | null;
  timezone: string;
  office_hours: unknown;
  server_now: string;
  ask_email: boolean;
  require_email: boolean;
  ask_dates: boolean;
  ask_travelers: boolean;
  ask_budget: boolean;
  ai_enabled: boolean;
  privacy_url: string | null;
  terms_url: string | null;
}

export interface LeadFormSettings {
  id: string;
  token: string;
  is_active: boolean;
  headline: string | null;
  welcome_message: string | null;
  closing_message: string | null;
  brand_color: string | null;
  agency_name_override: string | null;
  logo_url_override: string | null;
  consultant_name_override: string | null;
  consultant_role_override: string | null;
  consultant_photo_url_override: string | null;
  whatsapp_override: string | null;
  timezone: string;
  office_hours: unknown;
  hours_confirmed: boolean;
  ask_email: boolean;
  require_email: boolean;
  ask_dates: boolean;
  ask_travelers: boolean;
  ask_budget: boolean;
  ai_enabled: boolean;
  privacy_url: string | null;
  terms_url: string | null;
  test_mode_until: string | null;
  views_count: number;
  leads_count: number;
}

export type StepKey =
  | "name"
  | "phone"
  | "email"
  | "destination"
  | "travel_dates"
  | "travelers_count"
  | "budget"
  | "additional_info";

export interface StepDefinition {
  key: StepKey;
  question: string;
  placeholder: string;
  optional?: boolean;
  inputMode?: "text" | "tel" | "email";
}

const ALL_STEPS: Record<StepKey, StepDefinition> = {
  name: { key: "name", question: "Para começar, qual é o seu nome? 😊", placeholder: "Seu nome completo" },
  phone: {
    key: "phone",
    question: "Ótimo! Qual seu número de WhatsApp com DDD?",
    placeholder: "(11) 99999-9999",
    inputMode: "tel",
  },
  email: {
    key: "email",
    question: "Qual o seu melhor e-mail?",
    placeholder: "voce@email.com",
    inputMode: "email",
    optional: true,
  },
  destination: {
    key: "destination",
    question: "Para qual destino você gostaria de viajar? ✈️",
    placeholder: "Ex.: Orlando, Portugal, Nordeste...",
    optional: true,
  },
  travel_dates: {
    key: "travel_dates",
    question: "Tem alguma data ou período em mente?",
    placeholder: "Ex.: julho de 2026 ou ainda flexível",
    optional: true,
  },
  travelers_count: {
    key: "travelers_count",
    question: "Quantas pessoas vão viajar?",
    placeholder: "Ex.: 2 adultos e 1 criança",
    optional: true,
  },
  budget: {
    key: "budget",
    question: "Tem um orçamento aproximado em mente? (por pessoa ou total)",
    placeholder: "Ex.: até R$ 15.000 no total",
    optional: true,
  },
  additional_info: {
    key: "additional_info",
    question: "Quer adicionar algo mais? Pedidos especiais, dúvidas ou observações 💬",
    placeholder: "Escreva aqui (ou toque em pular)",
    optional: true,
  },
};

/** Steps actually shown, respecting the agency's question toggles. */
export function buildSteps(config: {
  ask_email?: boolean;
  require_email?: boolean;
  ask_dates?: boolean;
  ask_travelers?: boolean;
  ask_budget?: boolean;
}): StepDefinition[] {
  const steps: StepDefinition[] = [ALL_STEPS.name, ALL_STEPS.phone];
  if (config.ask_email !== false) {
    steps.push({ ...ALL_STEPS.email, optional: config.require_email !== true });
  }
  steps.push(ALL_STEPS.destination);
  if (config.ask_dates !== false) steps.push(ALL_STEPS.travel_dates);
  if (config.ask_travelers !== false) steps.push(ALL_STEPS.travelers_count);
  if (config.ask_budget !== false) steps.push(ALL_STEPS.budget);
  steps.push(ALL_STEPS.additional_info);
  return steps;
}

export function officeHoursOf(raw: unknown): OfficeHours {
  const normalized = normalizeOfficeHours(raw);
  const hasAny = Object.values(normalized).some((list) => (list ?? []).length > 0);
  return hasAny ? normalized : DEFAULT_OFFICE_HOURS;
}

export function timezoneOf(raw: unknown): string {
  return typeof raw === "string" && raw.trim() ? raw : DEFAULT_TIMEZONE;
}

/** Per-step validation used by the public form. Returns an error or null. */
export function validateStep(key: StepKey, value: string, requireEmail = false): string | null {
  const trimmed = value.trim();
  if (key === "name") {
    if (trimmed.length < 2) return "Digite seu nome (mínimo 2 letras).";
    if (trimmed.length > 100) return "Nome muito longo.";
    return null;
  }
  if (key === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) return "Informe um WhatsApp válido com DDD.";
    return null;
  }
  if (key === "email") {
    if (!trimmed) return requireEmail ? "Informe um e-mail válido." : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Informe um e-mail válido.";
    return null;
  }
  if (trimmed.length > 1000) return "Texto muito longo.";
  return null;
}

export interface LeadAnswers {
  name?: string;
  phone?: string;
  email?: string;
  destination?: string;
  travel_dates?: string;
  travelers_count?: string;
  budget?: string;
  additional_info?: string;
}

/** Deterministic fallback summary — never depends on AI being available. */
export function buildLeadSummary(answers: LeadAnswers): string {
  const parts: string[] = [];
  const name = (answers.name ?? "").trim();
  const dest = (answers.destination ?? "").trim();
  parts.push(name ? `${name} pediu contato` : "Novo contato recebido");
  if (dest) parts.push(`sobre ${dest}`);
  const details: string[] = [];
  if ((answers.travel_dates ?? "").trim()) details.push(`período: ${answers.travel_dates!.trim()}`);
  if ((answers.travelers_count ?? "").trim()) details.push(`viajantes: ${answers.travelers_count!.trim()}`);
  if ((answers.budget ?? "").trim()) details.push(`orçamento: ${answers.budget!.trim()}`);
  let out = `${parts.join(" ")}.`;
  if (details.length) out += ` ${details.join(" • ")}.`;
  return out.slice(0, 500);
}

/** WhatsApp text the visitor can send to the agency after finishing. */
export function buildLeadWhatsappMessage(answers: LeadAnswers, agencyName?: string | null): string {
  const lines = [
    `Olá${agencyName ? ` ${agencyName}` : ""}! Acabei de preencher o formulário de viagem.`,
    "",
    `Nome: ${(answers.name ?? "").trim() || "-"}`,
  ];
  if ((answers.destination ?? "").trim()) lines.push(`Destino: ${answers.destination!.trim()}`);
  if ((answers.travel_dates ?? "").trim()) lines.push(`Período: ${answers.travel_dates!.trim()}`);
  if ((answers.travelers_count ?? "").trim()) lines.push(`Viajantes: ${answers.travelers_count!.trim()}`);
  if ((answers.budget ?? "").trim()) lines.push(`Orçamento: ${answers.budget!.trim()}`);
  if ((answers.additional_info ?? "").trim()) lines.push(`Observações: ${answers.additional_info!.trim()}`);
  lines.push("", "Aguardo o contato. Obrigado!");
  return lines.join("\n");
}
