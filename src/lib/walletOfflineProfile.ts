/**
 * Compatibilidade do cache offline da Carteira Digital pública.
 *
 * Caches antigos foram gravados antes de `public_content_locale` existir no
 * payload dos RPCs públicos. Um cache assim NÃO pode decidir o idioma: se o
 * servidor devolveu branding válido (com idioma), ele complementa o perfil
 * salvo; sem isso, o campo fica ausente e `resolvePublicLocale` cai no
 * fallback pt-BR.
 */

type MaybeProfile = ({ public_content_locale?: string | null } & Record<string, any>) | null | undefined;

export function hasPublicLocale(profile: MaybeProfile): boolean {
  return !!profile && typeof profile.public_content_locale === "string" && profile.public_content_locale.trim() !== "";
}

/**
 * Reconcilia o perfil vindo do cache com o branding devolvido pelo servidor.
 * Nunca sobrescreve dados já presentes no cache além do idioma ausente.
 */
export function reconcileCachedAgentProfile<T extends MaybeProfile, B extends MaybeProfile>(
  cachedProfile: T,
  serverBranding: B,
): T | (T & { public_content_locale: string }) {
  if (hasPublicLocale(cachedProfile)) return cachedProfile;
  if (!cachedProfile) return (serverBranding ?? cachedProfile) as any;
  if (hasPublicLocale(serverBranding)) {
    return { ...(cachedProfile as any), public_content_locale: serverBranding!.public_content_locale } as any;
  }
  return cachedProfile;
}
