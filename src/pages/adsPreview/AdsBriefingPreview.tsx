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
const ClubMedSnowCollectionPage = lazy(() => import("@/pages/whitelabel/clubMedSnow/ClubMedSnowCollectionPage"));
const ClubMedSnowResortPage = lazy(() => import("@/pages/whitelabel/clubMedSnow/ClubMedSnowResortPage"));
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
        navigate(path);
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
    if (subPath === "ingressos-orlando") {
      body = <div className="wl-orlando-page"><OrlandoEditorialGallery hostname={info.hostname} /><OrlandoTicketsSection hostname={info.hostname} phone={info.phone} mode="page" /></div>;
    } else if (subPath === "visto-americano") {
      body = <div data-preview-interactive><UsVisaLandingPage info={info} presentation /></div>;
    } else if (subPath === "dmc-portugal") {
      body = <div data-preview-interactive><DmcPortugalLandingPage info={info} presentation /></div>;
    } else if (pages.editorial && /^(ofertas|blog|politicas|termos|area-do-cliente)/.test(subPath)) {
      body = <AgencyPresentationPages page={subPath} info={info} />;
    } else if (subPath === "resorts-brasil") {
      body = <div className="mx-auto max-w-6xl px-4 py-12 md:py-20"><BrazilResortsMap title={pages.resorts?.title} resortHref={(slug) => agencySiteHref(`/resorts-brasil/${slug}`)} /></div>;
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
      {fixture.jobId === "briefing-23-v1" && <style>{`
        [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) > .relative > .relative {
          width: 48%; max-width: 600px;
        }
        [data-ads-preview="briefing-23-v1"] #topo img[src$="/hero-rafael-neve.webp"] {
          object-position: 75% center;
        }
        @media (max-width: 767px) {
          [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) {
            background: #000; padding-bottom: 4rem !important;
          }
          [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) > .absolute {
            position: relative; height: 260px;
          }
          [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) > .absolute > [aria-hidden] {
            display: none;
          }
          [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) > .relative {
            padding-top: 24px; padding-bottom: 12px;
          }
          [data-ads-preview="briefing-23-v1"] #topo:has(img[src$="/hero-rafael-neve.webp"]) > .relative > .relative {
            width: 100%; max-width: none;
          }
        }

        /* Arena review: solid surfaces; image overlays retain their contrast. */
        [data-ads-preview="briefing-23-v1"] :is(.wl-alt-gradient, .wl-soft-gradient, .wl-alt-surface) {
          background: #fff !important; background-image: none !important;
        }
        [data-ads-preview="briefing-23-v1"] :is(#resorts, #resorts-brasil, #diferenciais) {
          background: #fff !important; background-image: none !important;
        }
        [data-ads-preview="briefing-23-v1"] :is(#temporada-cruzeiros, #destinos, #faq) {
          background: #000 !important; background-image: none !important; color: #fff;
          --foreground: 0 0% 100%; --muted-foreground: 0 0% 100%; --wl-ink: 0 0% 100%;
          --border: 0 0% 64%; --brand-primary: #fff; --brand-on-primary: #000;
        }
        [data-ads-preview="briefing-23-v1"] :is(#destinos, #faq) :is(h2, h3, p),
        [data-ads-preview="briefing-23-v1"] #faq [data-state] { color: #fff !important; }
        [data-ads-preview="briefing-23-v1"] #temporada-cruzeiros > div > div {
          background: #000 !important; border-color: #a3a3a3;
        }
        [data-ads-preview="briefing-23-v1"] #temporada-cruzeiros :is(h2, p, li a, li span) { color: #fff !important; }
        [data-ads-preview="briefing-23-v1"] #temporada-cruzeiros :is(figcaption, nav a) {
          background: #000 !important; color: #a3a3a3 !important;
        }
        [data-ads-preview="briefing-23-v1"] #temporada-cruzeiros a.inline-flex,
        [data-ads-preview="briefing-23-v1"] #faq button:not([data-state]) {
          background: #fff !important; color: #000 !important; border-color: #fff !important;
        }
        [data-ads-preview="briefing-23-v1"] #faq button:not([data-state]) * { color: #000 !important; }

        [data-ads-preview="briefing-23-v1"] header {
          background: #000 !important; --foreground: 0 0% 100%; --muted-foreground: 0 0% 80%; --background: 0 0% 0%;
        }
        [data-ads-preview="briefing-23-v1"] header a,
        [data-ads-preview="briefing-23-v1"] header button { color: #fff !important; }
        [data-ads-preview="briefing-23-v1"] #rodape > div:first-child p.uppercase { color: #a3a3a3 !important; }
        [data-ads-preview="briefing-23-v1"] header > div:first-child {
          height: auto !important; min-height: 108px; padding-top: 8px; padding-bottom: 8px;
        }
        [data-ads-preview="briefing-23-v1"] header > div:first-child > a { flex-shrink: 0; }
        [data-ads-preview="briefing-23-v1"] #rodape > div:first-child,
        [data-ads-preview="briefing-23-v1"] #rodape > div:first-child * { color: #fff !important; }
        [data-ads-preview="briefing-23-v1"] #rodape > div:last-child > div {
          padding-top: 8px !important; padding-bottom: 8px !important; line-height: 1.5; color: #000 !important;
        }
        [data-ads-preview="briefing-23-v1"] header > div:first-child > a > span { display: none; }
        [data-ads-preview="briefing-23-v1"] header img[alt^="Logo "] {
          height: 92px !important; width: auto !important; max-width: 253px !important; object-fit: contain; flex-shrink: 0;
        }
        [data-ads-preview="briefing-23-v1"] #rodape {
          background: #000 !important; color: #fff; --wl-ink: 0 0% 100%;
        }
        [data-ads-preview="briefing-23-v1"] #rodape img[alt^="Logo "] {
          height: 108px !important; width: auto; max-width: 324px; object-fit: contain;
        }
        [data-ads-preview="briefing-23-v1"] #rodape span:has(> img) {
          background: transparent !important; padding: 0; box-shadow: none;
        }
        [data-ads-preview="briefing-23-v1"] #rodape > div:last-child {
          background: #fff !important; --wl-ink: 0 0% 0%; color: #000;
        }
        @media (min-width: 768px) {
          [data-ads-preview="briefing-23-v1"] header > div:first-child { min-height: 131px; }
          [data-ads-preview="briefing-23-v1"] header img[alt^="Logo "] { height: 115px !important; max-width: 299px !important; }
          [data-ads-preview="briefing-23-v1"] #rodape img[alt^="Logo "] { height: 135px !important; }
        }
      `}</style>}
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
