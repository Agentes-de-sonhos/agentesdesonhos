import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  agencyHostFromLocation,
  fetchAgencyBySlug,
  fetchAgencyDomain,
} from "@/lib/agencyDomains";
import {
  isCanonicalAgencySiteHost,
  isSharedAgencySiteHost,
  parseAgencySlugLocation,
} from "@/lib/agencySlugRouting";
import { resolveConstructionVariant } from "@/lib/agencySiteStatus";
import { canonicalRedirectHost, withSiteContacts } from "@/lib/agencySiteContacts";
import PublicDomainRoot, { publicDomainRootLabel } from "@/components/routing/PublicDomainRoot";
import { resolveAgencyFaviconUrl } from "@/lib/agencySiteBrand";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";

import { useNoindex } from "@/hooks/useNoindex";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

const AgencyDomainRoutes = lazy(() => import("@/components/routing/AgencyDomainRoutes"));
const EssyaTurComingSoon = lazy(() => import("@/pages/whitelabel/EssyaTurComingSoon"));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <AgencyBrandSpinner size="lg" />
  </div>
);

/** Host compartilhado sem slug válido: nada é revelado sobre os tenants. */
function SharedHostIndex() {
  useNoindex(true);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Endereço incompleto</h1>
        <p className="text-sm text-muted-foreground">
          Use o link completo enviado pela sua agência de viagens.
        </p>
      </div>
    </div>
  );
}

/**
 * When the current hostname belongs to an agency (custom domain), renders the
 * white-label agency site instead of the platform app. Otherwise renders the
 * platform routes untouched — platform hosts never even hit the network.
 *
 * Etapa 4: no host COMPARTILHADO `sites.agentesdesonhos.com.br/{agency_slug}` o
 * tenant vem do slug (resolvido no servidor) e todas as rotas passam a viver sob
 * o prefixo `/{slug}`. Domínios próprios continuam sem prefixo.
 */
export function AgencyDomainGate({ children }: { children: React.ReactNode }) {
  const browserHost = typeof window === "undefined" ? "" : window.location.hostname;
  const browserPath = typeof window === "undefined" ? "/" : window.location.pathname;
  const redirectHost = canonicalRedirectHost(browserHost);
  if (redirectHost && typeof window !== "undefined") {
    const { pathname, search, hash } = window.location;
    window.location.replace(`https://${redirectHost}${pathname}${search}${hash}`);
  }
  const shared = isSharedAgencySiteHost(browserHost);
  const slugLocation =
    typeof window === "undefined"
      ? null
      : parseAgencySlugLocation(browserHost, window.location.pathname);

  const host =
    typeof window === "undefined" || shared
      ? null
      : agencyHostFromLocation(browserHost, window.location.search);

  const { data, isLoading } = useQuery({
    queryKey: ["agency-domain", host],
    enabled: !!host,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchAgencyDomain(host as string),
  });

  // Aplica a marca antes da escolha da rota. Assim a home temporária e as
  // páginas públicas isoladas recebem o mesmo favicon do site completo.
  useAgencyFavicon(data ? resolveAgencyFaviconUrl(data) : null);

  const slug = slugLocation?.slug ?? null;
  const { data: bySlug, isLoading: slugLoading } = useQuery({
    queryKey: ["agency-slug", slug],
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchAgencyBySlug(slug as string),
  });

  const publicRootLabel = publicDomainRootLabel(browserHost, browserPath);
  if (publicRootLabel) {
    return <PublicDomainRoot label={publicRootLabel} />;
  }

  /**
   * Variante estática de "site em construção" (Essya Tur): não depende de
   * cadastro da agência no banco, então renderiza direto para o hostname —
   * apenas na home ("/"), preservando o princípio do status por domínio.
   */
  if (host && resolveConstructionVariant(host) === "essyaTur") {
    if (browserPath === "/" || browserPath === "") {
      return (
        <Suspense fallback={<Spinner />}>
          <EssyaTurComingSoon />
        </Suspense>
      );
    }
  }

  if (shared) {
    /**
     * Host compartilhado. No host CANÔNICO (`vitrine.tur.br`) a ausência de
     * Sites ADS ativo para o slug preserva integralmente o comportamento
     * antigo: as rotas da plataforma seguem servindo a Vitrine de Ofertas.
     * No host técnico interno nada é revelado sobre os tenants.
     */
    const canonical = isCanonicalAgencySiteHost(browserHost);
    const noAgency = canonical ? <>{children}</> : <SharedHostIndex />;
    if (!slug) return noAgency;
    if (slugLoading) return <Spinner />;
    if (!bySlug) return noAgency;
    return (
      <Suspense fallback={<Spinner />}>
        <AgencyDomainRoutes info={withSiteContacts(bySlug)} basePath={slugLocation?.basePath} />
      </Suspense>
    );
  }


  if (host && isLoading) return <Spinner />;

  if (host && data) {
    return (
      <Suspense fallback={<Spinner />}>
        <AgencyDomainRoutes info={withSiteContacts(data)} />
      </Suspense>
    );
  }

  return <>{children}</>;
}
