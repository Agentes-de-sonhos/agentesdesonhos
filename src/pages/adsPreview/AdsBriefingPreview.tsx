import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { agencySiteHref } from "@/lib/agencyContextLink";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { isTechnicalPreviewHost, isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { AgencyPresentationPages } from "@/components/whitelabel/AgencyPresentationPages";
import { resolveAgencyFaviconUrl } from "@/lib/agencySiteBrand";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

const CircuitTourPage = lazy(() => import("@/pages/whitelabel/CircuitTourPage"));
const CruiseItinerariesPage = lazy(() => import("@/pages/whitelabel/CruiseItinerariesPage"));
const CruiseSeasonPage = lazy(() => import("@/pages/whitelabel/CruiseSeasonPage"));
const CruiseShipRoutePage = lazy(() => import("@/pages/whitelabel/CruiseShipRoutePage"));
const UniversalLandingPage = lazy(() => import("@/pages/whitelabel/UniversalLandingPage"));
const DisneyLandingPage = lazy(() => import("@/pages/whitelabel/DisneyLandingPage"));
const DisneyHotelPage = lazy(() => import("@/pages/whitelabel/DisneyHotelPage"));
import { getUniversalHotelPage } from "@/components/landing/universal/universalHotelsCatalog";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const XcaretLandingPage = lazy(() => import("@/pages/whitelabel/XcaretLandingPage"));
const UsVisaLandingPage = lazy(() => import("@/pages/whitelabel/UsVisaLandingPage"));
const DmcPortugalLandingPage = lazy(() => import("@/pages/whitelabel/DmcPortugalLandingPage"));
const AgencyResortPage = lazy(() => import("@/pages/whitelabel/AgencyResortPage"));
const ClubMedSnowCollectionPage = lazy(() => import("@/pages/whitelabel/clubMedSnow/ClubMedSnowCollectionPage"));
const ClubMedSnowResortPage = lazy(() => import("@/pages/whitelabel/clubMedSnow/ClubMedSnowResortPage"));
const BrazilResortsMap = lazy(() => import("@/components/resorts-brasil/BrazilResortsMap").then((m) => ({ default: m.BrazilResortsMap })));
const OrlandoEditorialGallery = lazy(() => import("@/components/orlando/OrlandoEditorialGallery").then((m) => ({ default: m.OrlandoEditorialGallery })));
const OrlandoTicketsSection = lazy(() => import("@/components/orlando/OrlandoTicketsSection").then((m) => ({ default: m.OrlandoTicketsSection })));

/**
 * Prévia técnica revisável da fixture ADS. Reusa AgencySiteLayout/AgencySiteHome
 * sem cópias. Navegação e controles locais ficam ativos; envios e ações externas ficam
 * desativados e qualquer escrita/função de backend é bloqueada enquanto montada.
 */
export default function AdsBriefingPreview() {
  const { jobId, "*": subPath = "" } = useParams<{ jobId: string; "*": string }>();
  const navigate = useNavigate();
  const base = `/ads-briefing-preview/${jobId}`;
  const fixture = resolveAdsPreviewFixture(jobId);
  const allowed = fixture?.profile.presentation
    ? isCompletePresentationHost(window.location.hostname)
    : isTechnicalPreviewHost(window.location.hostname);
  const [notice, setNotice] = useState(false);
  useAgencyFavicon(allowed && fixture ? resolveAgencyFaviconUrl(fixture.info) : null);

  useEffect(() => {
    if (!allowed || !fixture) return;
    const prevTitle = document.title;
    document.title = fixture.documentTitle;
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = existing?.content ?? null;
    const robots = existing ?? document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    if (!existing) document.head.appendChild(robots);

    const flash = () => {
      setNotice(true);
      window.setTimeout(() => setNotice(false), 2200);
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const link = el?.closest("a");
      const btn = el?.closest("button,[role=button],input[type=submit]") as HTMLElement | null;
      const href = link?.getAttribute("href") ?? "";
      if (link && (href === base || href.startsWith(`${base}/`) || href.startsWith(`${base}#`) || href.startsWith(`${base}?`))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const [path, hash] = href.split("#");
        navigate(path);
        window.setTimeout(() => {
          if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
          else window.scrollTo(0, 0);
        }, 120);
        return;
      }
      if (link && href.startsWith("#")) return;
      // Local controls (filters, calculators, dialogs and carousels) are reviewable.
      // Submit events, external navigation and backend calls stay blocked below.
      const safe = btn && btn.getAttribute("type") !== "submit";
      if (link || (btn && !safe && btn.dataset.previewLocal !== "true")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        flash();
      }
    };
    const onSubmit = (e: Event) => {
      e.preventDefault();
      // Only the cart item editor is local-only. Never allow checkout/lead submits,
      // including portals mounted outside the page wrapper.
      if (!(e.target instanceof HTMLFormElement && e.target.dataset.previewLocal === "cart-item")) e.stopImmediatePropagation();
      flash();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    // Trava de rede: nenhuma escrita, RPC ou função de backend sai desta prévia.
    const origFetch = window.fetch;
    const origOpen = window.open;
    const backend = import.meta.env.VITE_SUPABASE_URL as string;
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      // Exceções: leituras públicas do Google (avaliações da agência e Club Med na neve), sem escrita.
      if (backend && url.startsWith(backend) && !["google-place-reviews", "club-med-snow-places"].some((f) => url.split("?")[0] === `${backend}/functions/v1/${f}`)) {
        return Promise.reject(new Error("Prévia de teste: acesso ao backend desativado."));
      }
      return origFetch(input, init);
    };
    window.open = () => null;

    return () => {
      document.title = prevTitle;
      if (prevRobots === null) robots.remove();
      else robots.content = prevRobots;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.fetch = origFetch;
      window.open = origOpen;
    };
  }, [allowed, fixture, base, navigate]);

  const pages = fixture?.pages ?? {};
  const resortSlug = /^resorts-brasil\/([a-z0-9-]+)$/.exec(subPath)?.[1];
  const snowSlug = /^club-med-neve\/([a-z0-9-]+)$/.exec(subPath)?.[1];
  const known =
    subPath === "" ||
    /^(circuitos\/[a-z0-9-]+|cruzeiros\/temporada-brasileira-2026-2027|cruzeiros\/[a-z0-9-]+\/[a-z0-9-]+|disney|universal|(?:disney|universal)\/hoteis\/[a-z0-9-]+)$/.test(subPath) ||
    subPath === "cruzeiros/encontre-seu-cruzeiro" ||
    subPath === "club-med-neve" || !!snowSlug ||
    (subPath === "xcaret" && pages.xcaret) ||
    (subPath === "ingressos-orlando" && pages.orlandoTickets) ||
    ((subPath === "resorts-brasil" || resortSlug) && pages.resorts) ||
    (subPath === "visto-americano" && pages.visa) ||
    (subPath === "dmc-portugal" && pages.dmc) ||
    (!!pages.editorial && /^(ofertas|blog(?:\/[a-z0-9-]+)?|politicasdeprivacidade|termosdeuso|area-do-cliente)$/.test(subPath));

  function renderPage() {
    if (!fixture) return null;
    const info = fixture.info;
    if (subPath === "xcaret" && pages.xcaret) {
      return <XcaretLandingPage info={info} slots={pages.xcaret.slots} textRewrites={pages.xcaret.textRewrites} noindex />;
    }
    let body: JSX.Element = <AgencySiteHome info={info} noindex />;
    if (/^(circuitos|cruzeiros|disney|universal)(\/|$)/.test(subPath)) {
      body = <Routes>
        <Route path="circuitos/:slug" element={<CircuitTourPage info={info} />} />
        <Route path="cruzeiros/temporada-brasileira-2026-2027/roteiros" element={<CruiseItinerariesPage info={info} />} />
            <Route path="cruzeiros/encontre-seu-cruzeiro" element={<CruiseSeasonPage info={info} assistantOnly />} />
        <Route path="cruzeiros/temporada-brasileira-2026-2027" element={<CruiseSeasonPage info={info} />} />
        <Route path="cruzeiros/:line/:ship" element={<CruiseShipRoutePage info={info} />} />
        <Route path="universal" element={<UniversalLandingPage info={info} noindex embedded />} />
        <Route path="disney" element={<DisneyLandingPage info={info} embedded />} />
        <Route path="universal/hoteis/:slug" element={<AgencyResortPage info={info} resolve={getUniversalHotelPage} backHref="/universal" kind="Hotel" />} />
        <Route path="disney/hoteis/:slug" element={<DisneyHotelPage info={info} />} />
      </Routes>;
    } else if (subPath === "ingressos-orlando") {
      body = <div className="wl-orlando-page"><OrlandoEditorialGallery hostname={info.hostname} /><OrlandoTicketsSection hostname={info.hostname} phone={info.phone} mode="page" /></div>;
    } else if (subPath === "visto-americano") {
      body = <div data-preview-interactive><UsVisaLandingPage info={info} presentation /></div>;
    } else if (subPath === "dmc-portugal") {
      body = <div data-preview-interactive><DmcPortugalLandingPage info={info} presentation /></div>;
    } else if (pages.editorial && /^(ofertas|blog|politicas|termos|area-do-cliente)/.test(subPath)) {
      body = <AgencyPresentationPages page={subPath} info={info} />;
    } else if (subPath === "resorts-brasil") {
      body = <div id="resorts-brasil" className="mx-auto max-w-6xl px-4 py-12 md:py-20"><BrazilResortsMap title={pages.resorts?.title} resortHref={(slug) => agencySiteHref(`/resorts-brasil/${slug}`)} /></div>;
    } else if (subPath === "club-med-neve") {
      body = <ClubMedSnowCollectionPage info={info} />;
    } else if (snowSlug) {
      body = <ClubMedSnowResortPage info={info} slugOverride={snowSlug} />;
    } else if (resortSlug) {
      body = <AgencyResortPage info={info} slug={resortSlug} />;
    }
    return <AgencySiteLayout info={info} noWhatsapp>{body}</AgencySiteLayout>;
  }

  if (!allowed || !fixture || !known) {
    return (
      <Suspense fallback={null}>
        <NotFound />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-ads-preview={fixture.jobId}>

      <div
        role="status"
        className="sticky top-0 z-[100] bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
      >
        {fixture.notice}
        {notice && <span className="ml-2 opacity-80">(esta ação não funciona na prévia)</span>}
      </div>
      <Suspense fallback={null}>
        {renderPage()}
      </Suspense>
    </div>
  );
}
