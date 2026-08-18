// Pure payload validation for the public booking-request endpoint.
// Kept dependency-free so it can be unit-tested from the app test suite.
// v3: orçamento nominal envia nome/e-mail/WhatsApp vazios; a exigência de contato
// vive no RPC (fallback sem client_id). Não reintroduzir obrigatoriedade aqui.

export const MAX_SELECTED_SERVICES = 100;

export type BookingRequestPayload = {
  agency_slug: string;
  code: string;
  selected_service_ids: string[];
  client_name: string;
  client_email: string;
  client_whatsapp: string;
  client_notes: string | null;
  disclaimer_accepted: true;
  idempotency_key: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_RE = /^[A-Za-z0-9._:-]{8,120}$/;

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, max) : "";

const digits = (v: string) => v.replace(/\D/g, "");

export function validateBookingRequestPayload(
  body: Record<string, unknown>
): { ok: true; data: BookingRequestPayload } | { ok: false; error: string } {
  const agency_slug = text(body.agency_slug, 120).toLowerCase();
  if (!SLUG_RE.test(agency_slug)) return { ok: false, error: "Link inválido." };

  const code = text(body.code, 64);
  if (code.length < 12) return { ok: false, error: "Link inválido." };

  const raw = Array.isArray(body.selected_service_ids) ? body.selected_service_ids : [];
  if (raw.length > MAX_SELECTED_SERVICES) {
    return { ok: false, error: "Muitos serviços selecionados." };
  }
  const ids = Array.from(
    new Set(raw.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)))
  );
  if (ids.length !== raw.length) {
    return { ok: false, error: "Seleção de serviços inválida." };
  }

  const client_name = text(body.client_name, 200);
  // Orcamento nominal (com cliente cadastrado) nao pede contato: o banco resolve a
  // identidade pelo quotes.client_id e IGNORA o que vier do navegador. Aqui apenas
  // validamos o FORMATO do que foi enviado; a obrigatoriedade do contato passou a ser
  // decidida no RPC (fallback de orcamento sem cliente vinculado).
  const client_email = text(body.client_email, 200).toLowerCase();
  const emailOk = client_email.length > 0 && EMAIL_RE.test(client_email);
  if (client_email.length > 0 && !emailOk) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const whatsappRaw = text(body.client_whatsapp, 40);
  const whatsappDigits = digits(whatsappRaw);
  const whatsappOk = whatsappDigits.length >= 10 && whatsappDigits.length <= 15;
  if (whatsappRaw.length > 0 && !whatsappOk) {
    return { ok: false, error: "Informe um WhatsApp válido com DDD." };
  }
  if (client_name.length > 0 && client_name.length < 2) {
    return { ok: false, error: "Informe seu nome completo." };
  }

  if (body.disclaimer_accepted !== true) {
    return { ok: false, error: "É necessário aceitar o aviso de que o pedido não confirma a reserva." };
  }

  const idempotency_key = text(body.idempotency_key, 120);
  if (!KEY_RE.test(idempotency_key)) return { ok: false, error: "Requisição inválida." };

  return {
    ok: true,
    data: {
      agency_slug,
      code,
      selected_service_ids: ids,
      client_name,
      client_email: emailOk ? client_email : "",
      client_whatsapp: whatsappOk ? whatsappRaw : "",
      client_notes: text(body.client_notes, 2000) || null,
      disclaimer_accepted: true,
      idempotency_key,
    },
  };
}

/** SHA-256 do IP + segredo do servidor; nunca guardamos o IP cru. */
export async function hashClientIp(ip: string, salt: string): Promise<string | null> {
  if (!ip || ip === "unknown") return null;
  const bytes = new TextEncoder().encode(`${salt}:${ip.trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
