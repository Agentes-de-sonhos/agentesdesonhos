import type { CommercialSignature, SignatureSnapshot } from "@/types/signature";

export function buildSnapshot(s: CommercialSignature | null | undefined): SignatureSnapshot | null {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    title: s.title ?? null,
    phone: s.phone ?? null,
    whatsapp: s.whatsapp ?? null,
    email: s.email ?? null,
    photo_url: s.photo_url ?? null,
    custom_message: s.custom_message ?? null,
    updated_at: s.updated_at ?? new Date().toISOString(),
  };
}

export interface AgentLike {
  name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  agency_name?: string | null;
  agency_logo_url?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ResolvedSignatureContact {
  name: string;
  title: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  photo_url: string | null;
  custom_message: string | null;
  isFromSignature: boolean;
}

/**
 * Resolves the contact info to display in public documents.
 * Snapshot fields override the agent profile when present.
 */
export function resolveSignatureContact(
  snapshot: SignatureSnapshot | null | undefined,
  agent: AgentLike | null | undefined,
): ResolvedSignatureContact {
  const fromSig = !!snapshot;
  const name = (snapshot?.name || agent?.name || "").trim();
  const phone = (snapshot?.phone || agent?.phone || "").toString();
  const whatsapp = (snapshot?.whatsapp || phone || "").toString();
  return {
    name: name || "Consultor(a)",
    title: snapshot?.title ?? null,
    phone,
    whatsapp,
    email: snapshot?.email || agent?.email || "",
    photo_url: snapshot?.photo_url || agent?.avatar_url || null,
    custom_message: snapshot?.custom_message ?? null,
    isFromSignature: fromSig,
  };
}

/** Build a WhatsApp URL from a raw number (defaults to BR country code). */
export function buildWhatsAppUrl(raw: string | null | undefined, message?: string): string {
  const num = (raw || "").replace(/\D/g, "");
  if (!num) return "";
  const withCountry = num.startsWith("55") ? num : `55${num}`;
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${withCountry}${q}`;
}