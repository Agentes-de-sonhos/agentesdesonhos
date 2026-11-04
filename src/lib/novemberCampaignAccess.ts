import { agencyContextHost } from "@/lib/agencyContextLink";
import { isCompletePresentationHost } from "@/lib/adsBriefingPreview";

export const NOVEMBER_CAMPAIGN_PATH = "/oportunidades-novembro";
const MUNDO_HOSTS = new Set(["omundoemcores.com.br", "www.omundoemcores.com.br"]);
export function isNovemberCampaignAllowed(hostname: string, search: string): boolean {
  const host = hostname.toLowerCase();
  // Functional campaign only on the agency domains or an explicit technical tenant context.
  if (MUNDO_HOSTS.has(host)) return true;
  if (!isCompletePresentationHost(host)) return false;
  return MUNDO_HOSTS.has(agencyContextHost(host, search) ?? "");
}
