import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { agencySiteHref } from "@/lib/agencyContextLink";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { isTechnicalPreviewHost, isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { AgencyPresentationPages } from "@/components/whitelabel/AgencyPresentationPages";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const XcaretLandingPage = lazy(() => import("@/pages/whitelabel/XcaretLandingPage"));
const UsVisaLandingPage = lazy(() => import("@/pages/whitelabel/UsVisaLandingPage"));
const DmcPortugalLandingPage = lazy(() => import("@/pages/whitelabel/DmcPortugalLandingPage"));
const AgencyResortPage = lazy(() => import("@/pages/whitelabel/AgencyResortPage"));
const BrazilResortsMap = lazy(() => import("@/components/resorts-brasil/BrazilResortsMap").then((m) => ({ default: m.BrazilResortsMap })));
const OrlandoEditorialGallery = lazy(() => import("@/components/orlando/OrlandoEditorialGallery").then((m) => ({ default: m.OrlandoEditorialGallery })));
const OrlandoTicketsSection = lazy(() => import("@/components/orlando/OrlandoTicketsSection").then((m) => ({ default: m.OrlandoTicketsSection })));

/** Áreas cujos botões de seleção seguem ativos (envio e backend continuam bloqueados). */
const INTERACTIVE_AREA = "#ingressos-orlando, [data-preview-interactive]";

/** Controles puramente visuais que continuam funcionando (carrosséis, FAQ, menu). */
const SAFE_BUTTON = /solicitar|calcular|adicionar|minha solicitação|finalizar solicitação|montar minha|consulte a proposta|conhecer possibilidades|revisar|editar|remover|^voltar$|^continuar$|^próximo$|anterior|próxim|proxim|slide|foto|vídeo|video|play|pausar|reproduzir|menu|fechar/i;

/**
 * Prévia técnica revisável da fixture ADS. Reusa AgencySiteLayout/AgencySiteHome
 * sem cópias. Todas as ações (links, formulários, CTAs, WhatsApp) ficam
 * desativadas e qualquer escrita/função de backend é bloqueada enquanto montada.
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
  useAgencyFavicon(allowed ? fixture?.info.logo_url : null);

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
        navigate(path.split("?")[0]);
        window.setTimeout(() => {
          if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
          else window.scrollTo(0, 0);
        }, 120);
        return;
      }
      if (link && href.startsWith("#")) return;
      const safe =
        btn &&
        ((fixture.jobId === "drica-completa-v1" && btn.getAttribute("type") !== "submit") ||
          btn.hasAttribute("aria-expanded") ||
          SAFE_BUTTON.test(btn.getAttribute("aria-label") ?? "") ||
          (fixture.profile.presentation && btn.getAttribute("type") !== "submit" && (SAFE_BUTTON.test(btn.textContent ?? "") || !!btn.closest("[role=dialog]"))) ||
          (btn.getAttribute("type") !== "submit" && !!btn.closest(INTERACTIVE_AREA)));
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
      if (!(fixture.profile.presentation && e.target instanceof HTMLFormElement && e.target.dataset.previewLocal === "cart-item")) e.stopImmediatePropagation();
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
      // Única exceção: leitura das avaliações públicas do Google (sem escrita).
      if (backend && url.startsWith(backend) && url.split("?")[0] !== `${backend}/functions/v1/google-place-reviews`) {
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
  const known =
    subPath === "" ||
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
    if (subPath === "ingressos-orlando") {
      body = <><OrlandoEditorialGallery hostname={info.hostname} /><OrlandoTicketsSection hostname={info.hostname} phone={info.phone} mode="page" /></>;
    } else if (subPath === "visto-americano") {
      body = <div data-preview-interactive><UsVisaLandingPage info={info} presentation /></div>;
    } else if (subPath === "dmc-portugal") {
      body = <div data-preview-interactive><DmcPortugalLandingPage info={info} presentation /></div>;
    } else if (pages.editorial && /^(ofertas|blog|politicas|termos|area-do-cliente)/.test(subPath)) {
      body = <AgencyPresentationPages page={subPath} info={info} />;
    } else if (subPath === "resorts-brasil") {
      body = <div className="mx-auto max-w-6xl px-4 py-12 md:py-20"><BrazilResortsMap title={pages.resorts?.title} resortHref={(slug) => agencySiteHref(`/resorts-brasil/${slug}`)} /></div>;
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
