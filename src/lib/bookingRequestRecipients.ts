/**
 * Espelho em TypeScript das regras aplicadas pela migração corretiva
 * (submit_quote_booking_request / pending_booking_request_deliveries).
 * Serve de especificação testável — o envio real acontece no banco/Edge Function.
 */
export type DeliveryChannel = "internal" | "email" | "whatsapp";
export type RecipientKind = "agency" | "consultant" | "client";

export interface BookingDelivery {
  channel: DeliveryChannel;
  recipient_kind: RecipientKind;
  recipient_email: string | null;
  recipient_phone: string | null;
  status: "sent" | "pending" | "skipped";
}

export interface BookingDeliveryInput {
  agencyId: string;
  quoteUserId: string;
  clientEmail?: string | null;
  clientWhatsapp?: string | null;
}

/** Sempre avisa a agência titular; avisa o consultor autor quando for outro usuário. */
export function buildBookingDeliveries(input: BookingDeliveryInput): BookingDelivery[] {
  const email = (input.clientEmail ?? "").trim().toLowerCase();
  const rows: BookingDelivery[] = [
    { channel: "internal", recipient_kind: "agency", recipient_email: null, recipient_phone: null, status: "sent" },
    { channel: "email", recipient_kind: "agency", recipient_email: null, recipient_phone: null, status: "pending" },
  ];
  if (input.quoteUserId && input.quoteUserId !== input.agencyId) {
    rows.push({ channel: "email", recipient_kind: "consultant", recipient_email: null, recipient_phone: null, status: "pending" });
  }
  if (email.length > 0) {
    rows.push({ channel: "email", recipient_kind: "client", recipient_email: email, recipient_phone: null, status: "pending" });
  }
  // WhatsApp sem integração: nunca gravar o telefone do cliente como telefone da agência.
  rows.push({ channel: "whatsapp", recipient_kind: "agency", recipient_email: null, recipient_phone: null, status: "skipped" });
  return rows;
}

/** Deduplica por (channel, recipient_kind, e-mail) — mesma chave do índice único. */
export function dedupeBookingDeliveries(rows: BookingDelivery[]): BookingDelivery[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.channel}|${r.recipient_kind}|${(r.recipient_email ?? "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** User id destinatário por recipient_kind. */
export function resolveDeliveryUserId(
  kind: RecipientKind,
  row: { agency_id: string; user_id: string },
): string | null {
  if (kind === "agency") return row.agency_id;
  if (kind === "consultant") return row.user_id;
  return null;
}

export interface AgencyPublicDomainRow {
  agency_slug: string;
  is_active: boolean;
  agency_id: string;
}

/** Slug válido: domínio White Label ativo da agência OU fallback do slug derivado. */
export function matchesAgencySlug(
  slug: string | null | undefined,
  ctx: { agencyId: string; domains: AgencyPublicDomainRow[]; derivedSlugs?: (string | null | undefined)[] },
): boolean {
  const s = (slug ?? "").trim().toLowerCase();
  if (!s) return false;
  const byDomain = ctx.domains.some(
    (d) => d.is_active && (d.agency_slug ?? "").trim().toLowerCase() === s && d.agency_id === ctx.agencyId,
  );
  if (byDomain) return true;
  return (ctx.derivedSlugs ?? []).some((d) => (d ?? "").trim().toLowerCase() === s && !!(d ?? "").trim());
}
