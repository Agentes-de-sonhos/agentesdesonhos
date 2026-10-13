import { useEffect } from "react";
import { BrandText } from "@/components/ui/brand-text";
import logoAsset from "@/assets/whitelabel/logo-bardelli-viagens.png.asset.json";
import faviconAsset from "@/assets/whitelabel/favicon-bardelli-viagens.png.asset.json";
import { resolveAgencyBrowserTitle } from "@/hooks/useAgencyBrowserTitle";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";

/**
 * Página temporária EXCLUSIVA do domínio bardelliviagens.com.br.
 * Estática: não depende de cadastro da agência no banco. Sem menu,
 * formulário, CTA, login ou links. Identidade: branco + vermelho #C00808.
 */
export default function BardelliViagensComingSoon() {
  useAgencyFavicon(faviconAsset.url);

  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      resolveAgencyBrowserTitle(window.location.hostname) ?? "Bardelli Viagens — Site em construção";

    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;
    description?.setAttribute(
      "content",
      "A Bardelli Viagens está preparando um novo site. Em breve, um novo espaço para planejar as suas próximas viagens.",
    );

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
      robots.remove();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-[0.07]"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, #C00808 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -right-28 h-[420px] w-[420px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, #C00808 0%, transparent 70%)" }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <section className="w-full rounded-[28px] border border-[#eee3e3] bg-white/90 px-7 py-12 text-center shadow-[0_24px_60px_-40px_rgba(120,10,10,0.35)] backdrop-blur-sm sm:px-14 sm:py-16">
          <img
            src={logoAsset.url}
            alt="Bardelli Viagens"
            className="mx-auto h-24 w-auto max-w-[300px] object-contain sm:h-32 sm:max-w-[400px]"
          />

          <div aria-hidden="true" className="mx-auto mt-10 h-px w-16 bg-[#C00808]" />

          <h1 className="mt-9 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-[34px]">
            Novo site em construção
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[#5f5f5f] sm:text-lg">
            A <BrandText>Bardelli Viagens</BrandText> está preparando um novo espaço para planejar as
            suas próximas viagens. Em breve, novidades por aqui.
          </p>

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-[#C00808]/80">
            Em breve
          </p>
        </section>
      </main>
    </div>
  );
}
