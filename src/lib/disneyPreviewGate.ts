import { isTechnicalPreviewHost } from "@/lib/agencyDomains";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

/**
 * A experiência Disney existe apenas em PRÉVIA: perfil Destinos com a Ju (editorialRose)
 * acessado por host técnico (editor/preview/local com `?__agency_host`). O domínio real nunca a expõe.
 */
export function isDisneyPreviewRouteEnabled(agencyHostname: string, browserHostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  return resolveSiteProfile(agencyHostname).key === "editorialRose" && isTechnicalPreviewHost(browserHostname);
}
