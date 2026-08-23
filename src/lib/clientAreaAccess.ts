/**
 * Área do Cliente White Label — Etapa 1 (acesso e senha).
 *
 * Regras de interface espelhadas do servidor (a autoridade final é sempre a
 * Edge Function + RLS). Nada aqui armazena senha: a senha inicial vive apenas
 * na memória do componente enquanto a janela de criação estiver aberta.
 */

export const CLIENT_AREA_PATH = "/area-do-cliente";

export const MIN_PASSWORD_LENGTH = 8;

export interface ClientAreaAccountStatus {
  client_id: string;
  agency_id: string;
  white_label_active: boolean;
  has_email: boolean;
  email: string | null;
  exists: boolean;
  status: "active" | "blocked" | null;
  login_email: string | null;
  first_login_at: string | null;
  last_login_at: string | null;
  login_count: number;
  password_updated_at: string | null;
  password_set_by: string | null;
  created_at: string | null;
  history: { action: string; actor: string; created_at: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidClientEmail(raw?: string | null): boolean {
  const email = (raw ?? "").trim().toLowerCase();
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

const OBVIOUS_PASSWORDS = [
  "12345678", "123456789", "1234567890", "11111111", "00000000", "password",
  "senha123", "senha1234", "agencia123", "qwertyui", "abcd1234", "admin123",
  "cliente123", "viagem123", "123123123", "aaaaaaaa", "password1", "12341234",
];

/** Mesma checagem do servidor: recusa senhas extremamente óbvias. */
export function isObviousPassword(password: string): boolean {
  const p = (password ?? "").trim().toLowerCase();
  if (!p) return true;
  if (OBVIOUS_PASSWORDS.includes(p)) return true;
  if (/^(.)\1+$/.test(p)) return true;
  if (/^0?123456/.test(p)) return true;
  return false;
}

/** `null` quando a senha é aceitável; mensagem em português quando não é. */
export function validatePasswordInput(password: string, confirm?: string): string | null {
  if ((password ?? "").length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 72) return "A senha precisa ter no máximo 72 caracteres.";
  if (/^\s|\s$/.test(password)) return "A senha não pode começar ou terminar com espaço.";
  if (isObviousPassword(password)) return "Escolha uma senha menos previsível.";
  if (confirm !== undefined && password !== confirm) return "As senhas não conferem.";
  return null;
}

// ─────────────────────────────────────────────────────────────
// Status legível
// ─────────────────────────────────────────────────────────────

export type ClientAreaStatusTone = "none" | "active" | "never" | "blocked";

export interface ClientAreaStatusView {
  tone: ClientAreaStatusTone;
  label: string;
  description: string;
}

export function describeAccountStatus(
  status: Pick<
    ClientAreaAccountStatus,
    "exists" | "status" | "first_login_at" | "last_login_at"
  > | null,
): ClientAreaStatusView {
  if (!status?.exists) {
    return {
      tone: "none",
      label: "Acesso não criado",
      description: "Este cliente ainda não possui acesso à Área do Cliente.",
    };
  }
  if (status.status === "blocked") {
    return {
      tone: "blocked",
      label: "Acesso bloqueado",
      description: "O cliente não consegue entrar até que o acesso seja reativado.",
    };
  }
  if (!status.last_login_at) {
    return {
      tone: "never",
      label: "Acesso criado · nunca acessou",
      description: "A conta está ativa, mas o cliente ainda não entrou.",
    };
  }
  return {
    tone: "active",
    label: "Conta ativa",
    description: `Último acesso em ${formatDateTime(status.last_login_at)}.`,
  };
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export const AUDIT_LABELS: Record<string, string> = {
  account_created: "Acesso criado pela agência",
  password_reset_by_agency: "Nova senha gerada pela agência",
  account_blocked: "Acesso bloqueado",
  account_unblocked: "Acesso reativado",
  first_login: "Primeiro acesso do cliente",
  login_success: "Login do cliente",
  login_throttled: "Tentativas excessivas bloqueadas",
  origin_throttled: "Tentativas excessivas de uma mesma origem",
  password_changed_by_client: "Senha alterada pelo cliente",
  logout: "Saída do cliente",
  recovery_requested: "Recuperação de acesso solicitada",
  session_rotated: "Sessão renovada",
};


// ─────────────────────────────────────────────────────────────
// Mensagem automática (nunca enviada automaticamente nesta etapa)
// ─────────────────────────────────────────────────────────────

export function clientAreaUrl(hostname?: string | null): string {
  const host = (hostname ?? "").trim().toLowerCase();
  if (!host) return CLIENT_AREA_PATH;
  return `https://${host}${CLIENT_AREA_PATH}`;
}

export interface AccessMessageInput {
  clientName?: string | null;
  agencyName?: string | null;
  url: string;
  email: string;
  password: string;
}

export function buildAccessMessage(input: AccessMessageInput): string {
  const firstName = (input.clientName ?? "").trim().split(/\s+/)[0] || "tudo bem";
  const agency = (input.agencyName ?? "").trim() || "sua agência";
  return [
    `Olá, ${firstName}!`,
    "",
    `Criamos seu acesso à Área do Cliente da ${agency}.`,
    "",
    "Por lá você poderá acompanhar suas viagens e, nas próximas atualizações, acessar serviços, documentos, roteiro e Carteira Digital.",
    "",
    `Acesso: ${input.url}`,
    `Login: ${input.email}`,
    `Senha inicial: ${input.password}`,
    "",
    "Você poderá alterar sua senha depois de entrar, caso deseje.",
    "",
    `Em caso de dúvida, fale conosco pelos canais de atendimento da ${agency}.`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────
// Sessão do cliente final (navegador)
// ─────────────────────────────────────────────────────────────

/** A sessão é isolada por domínio: nunca compartilhada entre agências. */
export function clientAreaSessionKey(hostname: string): string {
  return `ads_client_area_session:${(hostname || "").trim().toLowerCase()}`;
}

export function readClientAreaToken(hostname: string): string | null {
  try {
    return window.localStorage.getItem(clientAreaSessionKey(hostname));
  } catch {
    return null;
  }
}

export function writeClientAreaToken(hostname: string, token: string | null) {
  try {
    const key = clientAreaSessionKey(hostname);
    if (token) window.localStorage.setItem(key, token);
    else window.localStorage.removeItem(key);
  } catch {
    /* storage indisponível: a sessão vira apenas de memória */
  }
}

/**
 * Pré-preenchimento seguro do e-mail: aceitamos apenas um e-mail em
 * `?login=` (nunca senha, nunca token) e ignoramos qualquer outro parâmetro.
 */
export function prefilledEmailFromSearch(search: string): string {
  const raw = new URLSearchParams(search || "").get("login") || "";
  const email = raw.trim().toLowerCase();
  return isValidClientEmail(email) ? email : "";
}

// ─────────────────────────────────────────────────────────────
// Chamadas à Edge Function (hostname obrigatório em todas)
// ─────────────────────────────────────────────────────────────

export type ClientAreaAuthAction =
  | "login"
  | "session"
  | "logout"
  | "change_password"
  | "recovery";

/**
 * Corpo padrão de qualquer chamada à `client-area-auth`.
 * O hostname é obrigatório: o servidor resolve a agência pelo domínio e recusa
 * a requisição quando ele está ausente, inativo ou sem White Label elegível.
 */
export function clientAreaAuthBody(
  action: ClientAreaAuthAction,
  hostname: string,
  payload: Record<string, unknown> = {},
): Record<string, unknown> {
  return { action, hostname: (hostname || "").trim().toLowerCase(), ...payload };
}

/**
 * Orientação verdadeira da recuperação: nesta etapa não há envio automático de
 * e-mail. A agência gera a nova senha e entrega pelo canal de atendimento.
 */
export const RECOVERY_GUIDANCE =
  "Nesta etapa a nova senha é gerada pela própria agência. Fale com o atendimento para receber um novo acesso — nenhum e-mail automático é enviado.";

/** Link de WhatsApp da agência (ou `null` quando não há telefone cadastrado). */
export function agencyWhatsappLink(
  phone?: string | null,
  message?: string,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${text}`;
}

