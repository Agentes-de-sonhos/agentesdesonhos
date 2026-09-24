import { useEffect } from "react";

const AGENCY_FAVICON_ID = "agency-favicon";

function cacheScopedLogoUrl(logoUrl: string): string {
  try {
    const url = new URL(logoUrl, window.location.origin);
    url.searchParams.set("favicon", "agency-v2");
    return url.href;
  } catch {
    return logoUrl;
  }
}

/**
 * Troca os favicons concorrentes por um único ícone da agência enquanto o
 * domínio white-label estiver montado, restaurando os originais ao sair.
 * Sem logotipo resolvido, nada é alterado (favicon padrão da plataforma).
 */
export function useAgencyFavicon(logoUrl?: string | null) {
  useEffect(() => {
    if (!logoUrl) return;

    const previousLinks = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
    ).map((link) => ({ link, nextSibling: link.nextSibling }));

    previousLinks.forEach(({ link }) => link.remove());

    const agencyIcon = document.createElement("link");
    agencyIcon.id = AGENCY_FAVICON_ID;
    agencyIcon.rel = "icon";
    agencyIcon.href = cacheScopedLogoUrl(logoUrl);
    document.head.appendChild(agencyIcon);

    return () => {
      agencyIcon.remove();
      previousLinks.forEach(({ link, nextSibling }) => {
        if (nextSibling?.parentNode === document.head) {
          document.head.insertBefore(link, nextSibling);
        } else {
          document.head.appendChild(link);
        }
      });
    };
  }, [logoUrl]);
}
