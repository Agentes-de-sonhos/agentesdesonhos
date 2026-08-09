/**
 * Reusable hostname → agency (tenant) resolution for white-label agency sites.
 *
 * A hostname is only treated as an agency domain when it is NOT one of the
 * platform/reserved hosts and the `get_agency_domain` RPC returns a match.
 * Public codes accessed on an agency domain are always validated with the
 * agency_slug that comes from the DOMAIN (never from the URL path).
 */
import { supabase } from "@/integrations/supabase/client";

export interface AgencyDomainInfo {
  user_id: string;
  agency_slug: string;
  hostname: string;
  is_primary: boolean;
  agency_name: string | null;
  owner_name: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  public_slug: string | null;
}

/** Hosts owned by the platform — never resolved as agency domains. */
export const RESERVED_HOST_SUFFIXES = [
  "lovable.app",
  "lovableproject.com",
  "lovableproject-dev.com",
  "localhost",
  "agentesdesonhos.com.br",
  "agentedesonhos.com.br",
  "vitrine.tur.br",
  "carteiradigital.tur.br",
  "seuorcamento.tur.br",
  "seuroteiro.tur.br",
  "contato.tur.br",
  "proximaviagem.tur.br",
];

export const RESERVED_HOST_PREFIXES = ["lp.", "ativar-cartao", "app.", "id-preview--", "preview--"];

export function normalizeHostname(hostname: string): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** True when the hostname could belong to an agency (i.e. not a platform host). */
export function isPotentialAgencyHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  if (host === "localhost" || host.startsWith("127.") || host === "[::1]") return false;
  if (RESERVED_HOST_PREFIXES.some((p) => host.startsWith(p))) return false;
  if (RESERVED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return false;
  return host.includes(".");
}

/**
 * Preview helper: allows validating the white-label site from a platform
 * preview host using ?__agency_host=100limites.tur.br
 */
export function agencyHostFromLocation(hostname: string, search: string): string | null {
  const host = normalizeHostname(hostname);
  const override = new URLSearchParams(search || "").get("__agency_host");
  if (override) {
    const candidate = normalizeHostname(override);
    return isPotentialAgencyHost(candidate) ? candidate : null;
  }
  return isPotentialAgencyHost(host) ? host : null;
}

export async function fetchAgencyDomain(hostname: string): Promise<AgencyDomainInfo | null> {
  const host = normalizeHostname(hostname);
  if (!host) return null;
  const { data, error } = await supabase.rpc("get_agency_domain" as any, { p_hostname: host });
  if (error) throw error;
  const info = data as AgencyDomainInfo | null;
  if (!info || !info.user_id) return null;
  return info;
}

/** Display name with elegant fallback. */
export function agencyDisplayName(info: AgencyDomainInfo | null): string {
  return info?.agency_name?.trim() || info?.owner_name?.trim() || "Sua agência de viagens";
}

/** Digits-only WhatsApp number, or null when the profile has no phone yet. */
export function agencyWhatsappNumber(info: AgencyDomainInfo | null): string | null {
  const raw = (info?.phone || "").replace(/\D/g, "");
  if (raw.length < 10) return null;
  return raw.startsWith("55") ? raw : `55${raw}`;
}