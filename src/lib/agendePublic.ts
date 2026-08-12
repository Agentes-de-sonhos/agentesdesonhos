/**
 * Public "Agende" (schedule a presentation) integration.
 * Talks to the Educatravel Academy public Edge Function with CORS only —
 * no service role, no secrets. Pure helpers here so they can be unit-tested.
 */

export const AGENDE_API_URL =
  "https://emdbkrhkyjsujefosjlf.supabase.co/functions/v1/agende-public-api";

export const AGENDE_TIMEZONE = "America/Sao_Paulo";

export interface AgendeSession {
  id: string;
  slug: string;
  name?: string | null;
  starts_at: string;
  session_date?: string | null;
  timezone?: string | null;
  capacity?: number | null;
  registrations?: number | null;
  seats_left?: number | null;
  is_full?: boolean | null;
}

export interface AgendeRegisterInput {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  whatsappOptIn: boolean;
  agencyName: string;
  state: string;
  city: string;
}

export type AgendeAdTracking = Record<string, string>;

const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
] as const;

const TRACKING_STORAGE_KEY = "agende:tracking";

/** Extracts UTMs and ad click IDs from a query string (e.g. window.location.search). */
export function parseTracking(search: string): AgendeAdTracking {
  const params = new URLSearchParams(search || "");
  const out: AgendeAdTracking = {};
  for (const key of TRACKING_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) out[key] = value.trim().slice(0, 200);
  }
  return out;
}

/**
 * Reads tracking from the URL and persists it, so a visitor who navigates
 * within the page (or reloads without the query) keeps campaign attribution.
 */
export function resolveTracking(search: string): AgendeAdTracking {
  const fromUrl = parseTracking(search);
  if (typeof window === "undefined") return fromUrl;
  try {
    if (Object.keys(fromUrl).length > 0) {
      window.sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const raw = window.sessionStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AgendeAdTracking;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return fromUrl;
  }
}

/* ------------------------------------------------------------------ */
/*  Dates — always pt-BR / America/Sao_Paulo                           */
/* ------------------------------------------------------------------ */

/** "YYYY-MM-DD" of an instant in São Paulo. */
export function spDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENDE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "Hoje, 12 de agosto" / "Amanhã, 13 de agosto" / "quinta-feira, 14 de agosto". */
export function formatSessionDate(startsAt: string, now: Date = new Date()): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const dayMonth = new Intl.DateTimeFormat("pt-BR", {
    timeZone: AGENDE_TIMEZONE,
    day: "numeric",
    month: "long",
  }).format(date);

  const key = spDateKey(date);
  const todayKey = spDateKey(now);
  const tomorrowKey = spDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  if (key === todayKey) return `Hoje, ${dayMonth}`;
  if (key === tomorrowKey) return `Amanhã, ${dayMonth}`;

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: AGENDE_TIMEZONE,
    weekday: "long",
  }).format(date);
  return `${weekday}, ${dayMonth}`;
}

/** "às 17h" or "às 17h30". */
export function formatSessionTime(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: AGENDE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const [hour, minute] = parts.split(":");
  return minute === "00" ? `às ${Number(hour)}h` : `às ${Number(hour)}h${minute}`;
}

/* ------------------------------------------------------------------ */
/*  Seats                                                             */
/* ------------------------------------------------------------------ */

export interface SeatsLabel {
  text: string;
  tone: "full" | "scarce" | "available" | "unknown";
}

/** Real availability only — never invents scarcity. Scarcity badge only when <= 3. */
export function seatsLabel(session: Pick<AgendeSession, "seats_left" | "is_full">): SeatsLabel {
  const left = session.seats_left;
  if (session.is_full || left === 0) return { text: "Vagas esgotadas", tone: "full" };
  if (typeof left !== "number" || !Number.isFinite(left) || left < 0)
    return { text: "Vagas disponíveis", tone: "unknown" };
  if (left <= 3)
    return {
      text: left === 1 ? "Última 1 vaga" : `Últimas ${left} vagas`,
      tone: "scarce",
    };
  return { text: `${left} vagas disponíveis`, tone: "available" };
}

export function isSessionSelectable(session: AgendeSession): boolean {
  return seatsLabel(session).tone !== "full";
}

/** Chronological order; the first entry is the nearest available session. */
export function sortSessions(sessions: AgendeSession[], now: Date = new Date()): AgendeSession[] {
  const nowMs = now.getTime();
  return [...sessions]
    .filter((s) => {
      const t = new Date(s.starts_at).getTime();
      return Number.isFinite(t) && t >= nowMs - 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export function firstSelectableIndex(sessions: AgendeSession[]): number {
  const idx = sessions.findIndex(isSessionSelectable);
  return idx === -1 ? 0 : idx;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

export interface AgendeFormValues {
  email: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  whatsappOptIn: boolean;
  agencyName: string;
  state: string;
  city: string;
}

export type AgendeFormErrors = Partial<Record<keyof AgendeFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function digitsOnly(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

/** (11) 99999-9999 progressive mask. */
export function maskWhatsapp(value: string): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validateAgendeForm(values: AgendeFormValues): AgendeFormErrors {
  const errors: AgendeFormErrors = {};
  if (!EMAIL_RE.test((values.email || "").trim()))
    errors.email = "Informe um e-mail válido para receber a confirmação.";
  if ((values.firstName || "").trim().length < 2) errors.firstName = "Informe seu primeiro nome.";
  if ((values.lastName || "").trim().length < 2) errors.lastName = "Informe seu sobrenome.";
  const phone = digitsOnly(values.whatsapp);
  if (phone.length < 10 || phone.length > 11)
    errors.whatsapp = "Informe o WhatsApp com DDD, por exemplo (11) 99999-9999.";
  if (!values.whatsappOptIn)
    errors.whatsappOptIn = "Precisamos da sua autorização para enviar a confirmação no WhatsApp.";
  if ((values.agencyName || "").trim().length < 2) errors.agencyName = "Informe o nome da sua agência.";
  if (!(values.state || "").trim()) errors.state = "Selecione o seu estado.";
  if ((values.city || "").trim().length < 2) errors.city = "Informe a sua cidade.";
  return errors;
}

/* ------------------------------------------------------------------ */
/*  API                                                               */
/* ------------------------------------------------------------------ */

async function callApi<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(AGENDE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const err = payload as { error?: string; message?: string } | null;
    const code = err?.error || err?.message || `http_${response.status}`;
    throw new Error(code);
  }
  return payload as T;
}

export async function fetchAgendeSessions(limit = 15): Promise<AgendeSession[]> {
  const data = await callApi<{ ok?: boolean; sessions?: AgendeSession[]; error?: string }>({
    action: "sessions",
    limit,
  });
  if (!data || data.ok === false) throw new Error(data?.error || "sessions_failed");
  return Array.isArray(data.sessions) ? data.sessions : [];
}

export interface AgendeRegisterResult {
  ok: boolean;
  alreadyRegistered: boolean;
}

export async function registerAgende(
  input: AgendeRegisterInput,
  tracking: AgendeAdTracking = {},
): Promise<AgendeRegisterResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const data = await callApi<{ ok?: boolean; error?: string; status?: string; already_registered?: boolean }>({
    action: "register",
    slug: input.slug,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: input.email.trim().toLowerCase(),
    whatsapp: input.whatsapp.trim(),
    whatsappOptIn: input.whatsappOptIn,
    agencyName: input.agencyName.trim(),
    state: input.state.trim(),
    city: input.city.trim(),
    ...tracking,
  });
  const already =
    data?.already_registered === true ||
    data?.status === "already_registered" ||
    data?.error === "already_registered";
  if (!data?.ok && !already) throw new Error(data?.error || "register_failed");
  return { ok: true, alreadyRegistered: already };
}

/** Friendly pt-BR message for API error codes. */
export function agendeErrorMessage(code: string): string {
  const normalized = (code || "").toLowerCase();
  if (normalized.includes("session_full") || normalized.includes("full"))
    return "Esta data acabou de lotar. Escolha outra data disponível.";
  if (normalized.includes("session_not_found") || normalized.includes("not_found"))
    return "Esta data não está mais disponível. Escolha outra data.";
  if (normalized.includes("invalid") || normalized.includes("validation"))
    return "Confira os dados informados e tente novamente.";
  if (normalized.includes("rate") || normalized.includes("429"))
    return "Muitas tentativas em sequência. Aguarde alguns instantes e tente de novo.";
  if (normalized.includes("failed to fetch") || normalized.includes("network"))
    return "Não conseguimos falar com o servidor. Verifique sua conexão e tente novamente.";
  return "Não foi possível concluir sua inscrição agora. Tente novamente em instantes.";
}

/* ------------------------------------------------------------------ */
/*  Analytics — never send PII                                        */
/* ------------------------------------------------------------------ */

export type AgendeEvent =
  | "agende_view"
  | "session_select"
  | "form_start"
  | "agende_submit"
  | "agende_success";

const PII_KEYS = ["email", "e_mail", "mail", "phone", "whatsapp", "telefone", "name", "nome"];

/** Strips any PII-looking key before pushing to the dataLayer. */
export function sanitizeAnalyticsPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    const lower = key.toLowerCase();
    if (PII_KEYS.some((p) => lower.includes(p))) continue;
    if (typeof value === "string" && /@|^\+?\d[\d\s()-]{7,}$/.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export function trackAgende(event: AgendeEvent, payload: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (!Array.isArray(dl)) return;
  dl.push({ event, ...sanitizeAnalyticsPayload(payload) });
}

/* ------------------------------------------------------------------ */
/*  Local prefill cache (convenience only, never auto-displayed)      */
/* ------------------------------------------------------------------ */

const PREFILL_KEY = "agende:prefill";

export type AgendePrefill = Pick<
  AgendeFormValues,
  "email" | "firstName" | "lastName" | "whatsapp" | "agencyName" | "state" | "city"
>;

export function saveAgendePrefill(values: AgendePrefill): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFILL_KEY, JSON.stringify(values));
  } catch {
    /* storage unavailable — prefill is a convenience only */
  }
}

export function readAgendePrefill(): AgendePrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgendePrefill;
    return parsed && typeof parsed === "object" && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
