import { useEffect } from "react";

/**
 * Troca o favicon do <head> pelo logotipo da agência enquanto o site
 * white-label estiver montado, restaurando os ícones originais ao sair.
 * Sem logotipo resolvido, nada é alterado (favicon padrão da plataforma).
 */
export function useAgencyFavicon(logoUrl?: string | null) {
  useEffect(() => {
    if (!logoUrl) return;
    const links = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'),
    );
    if (!links.length) return;
    const previous = links.map((link) => link.href);
    links.forEach((link) => {
      link.href = logoUrl;
    });
    return () => {
      links.forEach((link, index) => {
        link.href = previous[index];
      });
    };
  }, [logoUrl]);
}
