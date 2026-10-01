/**
 * Cache local (somente apresentação) do logotipo/nome da agência dona de um
 * link público, indexado pelo próprio token/código do link. Permite que o
 * carregador mostre o logotipo desde o primeiro quadro em acessos seguintes.
 * Nunca guarda dados privados; a chave é sempre específica do link (sem
 * "última agência" global), preservando o isolamento entre agências.
 */
const PREFIX = "public-loader-brand:";

export interface CachedLoaderBrand {
  logoUrl: string;
  agencyName: string | null;
}

export function readLoaderBrand(key?: string | null): CachedLoaderBrand | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.logoUrl === "string" && parsed.logoUrl ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLoaderBrand(key: string | null | undefined, logoUrl?: string | null, agencyName?: string | null) {
  if (!key || !logoUrl) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ logoUrl, agencyName: agencyName ?? null }));
  } catch {
    /* ignore */
  }
}
