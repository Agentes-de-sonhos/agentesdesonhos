import type { CommercialSignature, SignatureSnapshot } from "@/types/signature";

/**
 * Prefix used for the automatic "system" signature derived from the agency
 * holder (owner/master/subscriber) registration data. It is virtual: never
 * persisted in commercial_signatures, always resolved from the holder profile.
 */
export const SYSTEM_SIGNATURE_PREFIX = "system:";

export function systemSignatureId(agencyId: string): string {
  return `${SYSTEM_SIGNATURE_PREFIX}${agencyId}`;
}

export function isSystemSignatureId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(SYSTEM_SIGNATURE_PREFIX);
}

export interface AgencySignatureBase {
  user_id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email: string | null;
}

/**
 * Builds the automatic (virtual) signature from the agency holder data.
 * Never invents data: missing fields stay null.
 * Phone and WhatsApp share the same source number (single field in profile),
 * so consumers must not render the same number twice.
 */
export function buildSystemSignature(
  agencyId: string | null | undefined,
  base: AgencySignatureBase | null | undefined,
): CommercialSignature | null {
  if (!agencyId) return null;
  const name = (base?.name || "").trim();
  if (!name) return null;
  const phone = base?.phone?.trim() || null;
  return {
    id: systemSignatureId(agencyId),
    user_id: agencyId,
    name,
    title: null,
    phone,
    whatsapp: phone,
    email: base?.email?.trim() || null,
    photo_url: base?.avatar_url || null,
    custom_message: null,
    display_order: -1,
    is_active: true,
    is_default: false,
    created_at: "",
    updated_at: "",
  };
}

/**
 * Single source of truth for which commercial signature an agency uses.
 * Precedence:
 *  1. active custom signature explicitly marked as default;
 *  2. automatic signature built from the agency holder registration.
 * Never returns "nothing" when the holder data is available.
 */
export function getEffectiveCommercialSignature(input: {
  signatures?: CommercialSignature[] | null;
  systemSignature?: CommercialSignature | null;
}): CommercialSignature | null {
  const list = input.signatures || [];
  const explicit = list.find((s) => s.is_default && s.is_active && !isSystemSignatureId(s.id));
  if (explicit) return explicit;
  return input.systemSignature ?? null;
}

/** True when the effective signature is the automatic one (from registration). */
export function isSystemSignatureEffective(input: {
  signatures?: CommercialSignature[] | null;
  systemSignature?: CommercialSignature | null;
}): boolean {
  const eff = getEffectiveCommercialSignature(input);
  return !!eff && isSystemSignatureId(eff.id);
}

/** Resolves a snapshot stored on a document back to a live signature when possible. */
export function resolveSnapshotSignature(
  snapshot: SignatureSnapshot | null | undefined,
  signatures: CommercialSignature[],
  systemSignature: CommercialSignature | null,
): CommercialSignature | null {
  if (!snapshot?.id) return null;
  if (isSystemSignatureId(snapshot.id)) return systemSignature;
  return signatures.find((s) => s.id === snapshot.id) ?? null;
}
