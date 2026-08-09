/**
 * Public link builders that prefer the agency's own domain when it has one,
 * falling back to the generic platform domains (unchanged behaviour).
 */
import { CARTEIRA_DOMAIN } from "@/lib/carteira-domain";
import { ORCAMENTO_DOMAIN, agencyNameToSlug } from "@/lib/orcamento-domain";
import { ROTEIRO_DOMAIN } from "@/lib/roteiro-domain";

export type PublicLinkKind = "orcamento" | "roteiro" | "carteira" | "fatura";

function customBase(customDomain?: string | null): string | null {
  const host = (customDomain || "").trim().toLowerCase();
  if (!host) return null;
  return `https://${host.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
}

export function buildAgencyPublicLink(
  kind: PublicLinkKind,
  agencyName: string,
  accessCode: string,
  customDomain?: string | null,
): string {
  const base = customBase(customDomain);
  if (base) return `${base}/${kind}/${accessCode}`;

  const slug = agencyNameToSlug(agencyName || "");
  switch (kind) {
    case "orcamento":
      return `${ORCAMENTO_DOMAIN}/${slug}/${accessCode}`;
    case "roteiro":
      return `${ROTEIRO_DOMAIN}/${slug}/${accessCode}`;
    case "carteira":
      return `${CARTEIRA_DOMAIN}/${slug}/${accessCode}`;
    case "fatura":
      return `${window.location.origin}/fatura/${slug}/${accessCode}`;
  }
}