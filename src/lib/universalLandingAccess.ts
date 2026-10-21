import { resolveSiteProfile } from "@/lib/agencySiteProfile";

/** Perfis com a landing /universal (opt-in por agência). */
const UNIVERSAL_LANDING_PROFILES = new Set(["editorialRose", "editorialDmc", "mundoEmCoresBriefing14"]);

export function isUniversalLandingEnabled(hostname?: string | null): boolean {
  return UNIVERSAL_LANDING_PROFILES.has(resolveSiteProfile(hostname ?? "").key as string);
}

/** Conteúdo pessoal da Ju (foto, "Oi, eu sou a Ju", WhatsApp dela) só no perfil dela. */
export function isJuUniversalProfile(hostname?: string | null): boolean {
  return resolveSiteProfile(hostname ?? "").key === "editorialRose";
}
