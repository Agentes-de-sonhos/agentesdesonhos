import { useEffect } from "react";

const BROWSER_TITLE_BY_HOSTNAME: Record<string, string> = {
  "100limites.tur.br": "100 Limites Turismo",
  "www.100limites.tur.br": "100 Limites Turismo",
  "destinoscomaju.com.br": "Destinos com a Ju",
  "www.destinoscomaju.com.br": "Destinos com a Ju",
  "paraisoviagens.com": "Paraiso Viagens",
  "www.paraisoviagens.com": "Paraiso Viagens",
  "essyatur.com.br": "Essya Tur Viagens",
  "www.essyatur.com.br": "Essya Tur Viagens",
};

function normalizeHostname(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveAgencyBrowserTitle(hostname?: string | null): string | null {
  return BROWSER_TITLE_BY_HOSTNAME[normalizeHostname(hostname)] ?? null;
}

/** Aplica título somente aos tenants configurados, preservando os demais. */
export function useAgencyBrowserTitle(hostname?: string | null) {
  const title = resolveAgencyBrowserTitle(hostname);

  useEffect(() => {
    if (!title) return;
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}