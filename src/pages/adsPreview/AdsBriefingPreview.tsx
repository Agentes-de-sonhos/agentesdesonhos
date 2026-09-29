import { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { isTechnicalPreviewHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Controles puramente visuais que continuam funcionando (carrosséis, FAQ, menu). */
const SAFE_BUTTON = /anterior|próxim|proxim|slide|foto|vídeo|video|play|pausar|reproduzir|menu|fechar/i;

/**
 * Prévia técnica revisável da fixture ADS. Reusa AgencySiteLayout/AgencySiteHome
 * sem cópias. Todas as ações (links, formulários, CTAs, WhatsApp) ficam
 * desativadas e qualquer escrita/função de backend é bloqueada enquanto montada.
 */
export default function AdsBriefingPreview() {
  const { jobId } = useParams<{ jobId: string }>();
  const fixture = resolveAdsPreviewFixture(jobId);
  const allowed = isTechnicalPreviewHost(window.location.hostname);
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
      const safe =
        btn && (btn.hasAttribute("aria-expanded") || SAFE_BUTTON.test(btn.getAttribute("aria-label") ?? ""));
      if (link || (btn && !safe)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        flash();
      }
    };
    const onSubmit = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
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
      if (backend && url.startsWith(backend)) {
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
  }, [allowed, fixture]);

  if (!allowed || !fixture) {
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
        <AgencySiteLayout info={fixture.info} noWhatsapp>
          <AgencySiteHome info={fixture.info} />
        </AgencySiteLayout>
      </Suspense>
    </div>
  );
}
