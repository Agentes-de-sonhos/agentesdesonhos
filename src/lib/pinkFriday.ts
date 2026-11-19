import { agencyContextHost } from "@/lib/agencyContextLink";
import { normalizeHostname } from "@/lib/agencyDomains";
import { offerInChannel, type PublicOffer } from "@/lib/offers";

// A publicação da campanha será uma etapa separada, depois da revisão.
export const PINK_FRIDAY_LIVE_ENABLED = false;
export const PINK_FRIDAY_PATH = "/pink-friday";
export const PINK_FRIDAY_CHANNEL = "pink-friday";
export const PINK_FRIDAY_MAIN_HOST = "www.destinoscomaju.com.br";
const JU_HOSTS = new Set(["destinoscomaju.com.br", PINK_FRIDAY_MAIN_HOST]);
const PINK_FRIDAY_PREVIEW_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app",
]);

export function isPinkFridayAgency(hostname?: string | null): boolean {
  return JU_HOSTS.has(normalizeHostname(hostname ?? ""));
}

export function pinkFridayMode(resolvedHost: string, browserHost: string, search = "", liveEnabled: boolean = PINK_FRIDAY_LIVE_ENABLED) {
  if (!isPinkFridayAgency(resolvedHost)) return null;
  if (isPinkFridayAgency(browserHost)) return liveEnabled ? "live" : null;
  if (PINK_FRIDAY_PREVIEW_HOSTS.has(normalizeHostname(browserHost)) &&
    isPinkFridayAgency(agencyContextHost(browserHost, search))) return "preview";
  return null;
}

export function selectPinkFridayOffers(offers: PublicOffer[]) {
  return offers.filter(offer => offerInChannel(offer, PINK_FRIDAY_CHANNEL));
}
