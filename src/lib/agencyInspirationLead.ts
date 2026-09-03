/**
 * Captação de leads da seção editorial "Receba inspirações" dos sites white label.
 *
 * Reutiliza o fluxo público já existente (`submit-agency-site-request` →
 * `submit_agency_site_request` → `ensure_client_and_opportunity_for_lead`):
 * o tenant é SEMPRE resolvido no servidor pelo hostname. Aqui ficam apenas as
 * regras puras (máscara, validação e segurança da URL do grupo).
 */

/** Chave de serviço dedicada (espelha a allowlist do endpoint e do SQL). */
export const INSPIRATION_SERVICE_KEY = "inspiracoes";

/** Origem semântica registrada na gestão/CRM da agência. */
export const INSPIRATION_SOURCE_LABEL = "Site — Quero receber inspirações";

/** Observação visível no cadastro/histórico do lead. */
export const INSPIRATION_NOTE =
  "Lead captado pelo site para receber inspirações, novidades e promoções.";

export interface InspirationLeadForm {
  first_name: string;
  phone: string;
  email: string;
}

/** Máscara brasileira progressiva: (00) 00000-0000. */
export function maskBrazilianPhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Somente dígitos (DDD + número), como o backend espera. */
export function normalizeBrazilianPhone(value: string): string {
  return (value || "").replace(/\D/g, "").slice(0, 11);
}

export function isValidEmail(value: string): boolean {
  const email = (value || "").trim();
  if (email.length < 5 || email.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Os três campos são obrigatórios. Mensagens prontas para exibição. */
export function validateInspirationLead(form: InspirationLeadForm): Partial<Record<keyof InspirationLeadForm, string>> {
  const errors: Partial<Record<keyof InspirationLeadForm, string>> = {};
  const name = (form.first_name || "").trim();
  if (name.length < 2) errors.first_name = "Informe o seu primeiro nome.";
  const digits = normalizeBrazilianPhone(form.phone);
  if (digits.length < 10) errors.phone = "Informe um WhatsApp válido com DDD.";
  if (!isValidEmail(form.email)) errors.email = "Informe um e-mail válido.";
  return errors;
}

/**
 * Só devolve a URL quando ela é http/https e aponta para um convite legítimo
 * de WhatsApp (chat.whatsapp.com / *.whatsapp.com). Qualquer outra coisa vira
 * `null` e o modal opera em modo apenas captação — nunca renderizamos URL
 * insegura nem redirecionamos para destino arbitrário.
 */
export function safeWhatsappGroupUrl(raw?: string | null): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const allowed = host === "whatsapp.com" || host.endsWith(".whatsapp.com");
  if (!allowed) return null;
  return url.toString();
}

/** Payload enviado ao endpoint público compartilhado. */
export function buildInspirationPayload(form: InspirationLeadForm): Record<string, unknown> {
  return {
    service_key: INSPIRATION_SERVICE_KEY,
    service_label: INSPIRATION_SOURCE_LABEL,
    lead_name: (form.first_name || "").trim(),
    lead_phone: normalizeBrazilianPhone(form.phone),
    lead_email: (form.email || "").trim().toLowerCase(),
    preferred_channel: "whatsapp",
    summary: INSPIRATION_NOTE,
    notes: INSPIRATION_NOTE,
    consent: true,
    consent_version: "v1",
  };
}
