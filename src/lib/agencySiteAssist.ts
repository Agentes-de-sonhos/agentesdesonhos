/**
 * Atendimento flutuante do site white label: direciona direto para o WhatsApp
 * dentro do expediente e abre um recado (Central de Solicitações) fora dele.
 *
 * Regras:
 * - O horário é SEMPRE avaliado no fuso oficial de Brasília (America/Sao_Paulo),
 *   independente do relógio/fuso do visitante.
 * - Configuração declarativa por hostname; hosts sem preset não exibem o botão,
 *   preservando os demais tenants exatamente como estão hoje.
 * - Nenhum telefone é inventado aqui: o número vem do cadastro da agência.
 */

const SP_TIME_ZONE = "America/Sao_Paulo";

export interface AgencyAssistWindow {
  /** Dias atendidos: 0 = domingo ... 6 = sábado. */
  days: number[];
  /** Minutos desde a meia-noite (ex.: 9h = 540). */
  startMinute: number;
  endMinute: number;
}

export interface AgencyAssistHours extends AgencyAssistWindow {
  /** Faixas adicionais (ex.: sábado com horário reduzido). */
  extra?: AgencyAssistWindow[];
}

export interface AgencyAssistConfig {
  hours: AgencyAssistHours;
  /** Texto curto do botão em expediente. */
  onlineLabel: string;
  /** Texto curto do botão fora do expediente. */
  offlineLabel: string;
  /** Resumo do horário mostrado ao visitante. */
  hoursLabel: string;
  /** Rótulo do cartão de recado. */
  offlineTitle: string;
  /** Explicação acolhedora no cartão de recado. */
  offlineText: string;
}

const DESTINOS_HOURS: AgencyAssistHours = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 18 * 60,
  extra: [{ days: [6], startMinute: 9 * 60, endMinute: 14 * 60 }],
};

const DESTINOS_HOURS_LABEL = "segunda a sexta das 9h às 18h e sábados das 9h às 14h";

const DESTINOS_ASSIST: AgencyAssistConfig = {
  hours: DESTINOS_HOURS,
  onlineLabel: "Falar com a equipe",
  offlineLabel: "Deixe sua mensagem",
  hoursLabel: DESTINOS_HOURS_LABEL,
  offlineTitle: "Atendimento encerrado por hoje",
  offlineText: "Deixe seu recado que nossa equipe entra em contato no início do próximo expediente.",
};

/** Hosts com atendimento programado (root e www da mesma agência). */
const ASSIST_BY_HOST: Record<string, AgencyAssistConfig> = {
  "destinoscomaju.com.br": DESTINOS_ASSIST,
};

function normalizeHost(hostname?: string | null): string {
  return (hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function resolveSiteAssist(hostname?: string | null): AgencyAssistConfig | null {
  return ASSIST_BY_HOST[normalizeHost(hostname)] ?? null;
}

/** Dia da semana e minutos do dia no fuso de Brasília. */
export function saoPauloClock(date: Date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SP_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    weekday: weekdayMap[get("weekday")] ?? 0,
    minutes: (Number.isFinite(hour) ? hour % 24 : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
  };
}

/** Verdadeiro somente dentro dos dias e das faixas de horário configuradas. */
export function isWithinAssistHours(hours: AgencyAssistHours, date: Date = new Date()): boolean {
  const { weekday, minutes } = saoPauloClock(date);
  const windows: AgencyAssistWindow[] = [hours, ...(hours.extra ?? [])];
  return windows.some(
    (w) => w.days.includes(weekday) && minutes >= w.startMinute && minutes < w.endMinute,
  );
}

/** Contexto da página atual, usado para abrir a conversa já situada. */
export function assistPageContext(pathname: string, hash = ""): string | null {
  const path = (pathname || "/").toLowerCase();
  const anchor = (hash || "").toLowerCase();
  if (path.startsWith("/xcaret")) return "a página do Xcaret";
  if (path.startsWith("/ofertas")) return "as ofertas do site";
  if (path.startsWith("/area-do-cliente")) return "a Área do Cliente";
  if (anchor.includes("cruzeiro")) return "a seção de cruzeiros";
  if (anchor.includes("solicita")) return "a Central de Solicitações";
  return null;
}

/** Mensagem inicial pré-carregada no WhatsApp do visitante. */
export function assistWhatsappMessage(
  agencyName: string,
  pathname = "/",
  hash = "",
): string {
  const context = assistPageContext(pathname, hash);
  const where = context ? `Estava vendo ${context} no site` : "Estava no site";
  return `Olá! ${where} da ${agencyName} e gostaria de falar sobre uma viagem.`;
}

/* ------------------------------------------------------------------ */
/* Recado fora do expediente                                           */
/* ------------------------------------------------------------------ */

/** Chave de serviço reaproveitada (já consta na allowlist do endpoint e do SQL). */
export const ASSIST_SERVICE_KEY = "inspiracoes";

/** Origem semântica registrada na gestão/CRM da agência. */
export const ASSIST_SOURCE_LABEL = "Site — Recado fora do expediente";

export interface AssistMessageForm {
  name: string;
  phone: string;
  message: string;
}

/** Máscara brasileira progressiva: (00) 00000-0000. */
export function maskAssistPhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validateAssistMessage(
  form: AssistMessageForm,
): Partial<Record<keyof AssistMessageForm, string>> {
  const errors: Partial<Record<keyof AssistMessageForm, string>> = {};
  if ((form.name || "").trim().length < 2) errors.name = "Informe o seu nome.";
  if ((form.phone || "").replace(/\D/g, "").length < 10) {
    errors.phone = "Informe um WhatsApp válido com DDD.";
  }
  if ((form.message || "").trim().length < 5) {
    errors.message = "Conte em poucas palavras o que você precisa.";
  }
  return errors;
}

/** Payload do recado para o endpoint público compartilhado. */
export function buildAssistMessagePayload(form: AssistMessageForm): Record<string, unknown> {
  const message = (form.message || "").trim().slice(0, 2000);
  return {
    service_key: ASSIST_SERVICE_KEY,
    service_label: ASSIST_SOURCE_LABEL,
    lead_name: (form.name || "").trim(),
    lead_phone: (form.phone || "").replace(/\D/g, "").slice(0, 11),
    preferred_channel: "whatsapp",
    summary: message,
    notes: `Recado deixado pelo site fora do horário de atendimento: ${message}`,
    consent: true,
    consent_version: "v1",
  };
}
