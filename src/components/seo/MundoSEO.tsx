import { useLocation } from "react-router-dom";
import { SEO } from "./SEO";
import { MUNDO_ORIGIN, MUNDO_SITE_NAME, mundoSeoPage, isMundoSeoHost } from "@/lib/mundoSeo";

/** Mounted in both the tenant router and the standalone November campaign. */
export function MundoSEO({ hostname }: { hostname: string }) {
  const { pathname } = useLocation();
  const page = mundoSeoPage(hostname, pathname);
  if (!page) return null;
  const noindex = !isMundoSeoHost(window.location.hostname);
  return <SEO {...page} exactTitle siteName={MUNDO_SITE_NAME} noindex={noindex}
    image={`${MUNDO_ORIGIN}/og/share-mundo.jpg`} imageType="image/jpeg" imageAlt="Logotipo O Mundo em Cores"
    jsonLd={page.canonical === `${MUNDO_ORIGIN}/` ? { "@context": "https://schema.org", "@graph": [
      { "@type": "WebSite", "@id": `${MUNDO_ORIGIN}/#website`, name: MUNDO_SITE_NAME, alternateName: "O Mundo em Cores - Studio de Viagens", url: `${MUNDO_ORIGIN}/` },
      { "@type": "TravelAgency", "@id": `${MUNDO_ORIGIN}/#agency`, name: "O Mundo em Cores - Studio de Viagens", url: `${MUNDO_ORIGIN}/`, logo: `${MUNDO_ORIGIN}/og/share-mundo.jpg` },
    ] } : undefined} />;
}
