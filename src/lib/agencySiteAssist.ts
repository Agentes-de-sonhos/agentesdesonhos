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

export interface AgencyAssistHours {
  /** Dias atendidos: 0 = domingo ... 6 = sábado. */
  days: number[];
  /** Minutos desde a meia-noite (ex.: 9h = 540). */
  startMinute: number;
  endMinute: number;
}

export interface AgencyAssistConfig {
  hours: AgencyAssistHours;
  /** Texto curto do botão em expediente. */
  onlineLabel: string;
  /** Texto curto do botão fora do expediente. */
  offlineLabel: string;
  /** Resumo do horário mostrado ao visitante (ex.: "segunda a sexta, das 9h às 18h"). */
  hoursLabel: string;
  /** Rótulo do cartão de recado. */
  offlineTitle: string;
  /** Explicação acolhedora no cartão de recado. */
  offlineText: string;
}

const WEEKDAYS_9_TO_18: AgencyAssistHours = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 18 * 60,
};

const DESTINOS_ASSIST: AgencyAssistConfig = {
  hours: WEEKDAYS_9_TO_18,
  onlineLabel: "Falar com a Juliana",
  offlineLabel: "Deixe sua mensagem",
  hoursLabel: "segunda a sexta, das 9h às 18h",
  offlineTitle: "Atendimento encerrado por hoje",
  offlineText:
    "Nosso atendimento ao vivo funciona de segunda a sexta, das 9h às 18h. Deixe seu recado que a Juliana entra em contato no início do próximo expediente.",
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

/** Verdadeiro somente dentro dos dias e da faixa de horário configurados. */
export function isWithinAssistHours(hours: AgencyAssistHours, date: Date = new Date()): boolean {
  const { weekday, minutes } = saoPauloClock(date);
  if (!hours.days.includes(weekday)) return false;
  return minutes >= hours.startMinute && minutes < hours.endMinute;
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
