import { agencyContextHost } from "@/lib/agencyContextLink";
import { isCompletePresentationHost } from "@/lib/adsBriefingPreview";

export const NOVEMBER_CAMPAIGN_PATH = "/oportunidades-novembro";
export function isNovemberCampaignAllowed(hostname: string, search: string): boolean {
  if (!isCompletePresentationHost(hostname)) return false;
  const tenant = agencyContextHost(hostname, search);
  return tenant === "omundoemcores.com.br" || tenant === "www.omundoemcores.com.br";
}