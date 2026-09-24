import { useEffect } from "react";
import { BrandText } from "@/components/ui/brand-text";
import logoAsset from "@/assets/whitelabel/logo-essya-tur.png.asset.json";
import { resolveAgencyBrowserTitle } from "@/hooks/useAgencyBrowserTitle";

/**
 * Página temporária EXCLUSIVA do domínio essyatur.com.br.
 * Estática: não depende de cadastro da agência no banco (a Essya Tur ainda não
 * tem perfil — a página funciona mesmo quando `get_agency_domain` não resolve).
 * Sem menu, formulário, CTA, login ou links. Quando o site completo entrar no
 * ar, basta trocar a variante em `agencySiteStatus`.
 */
export default function EssyaTurComingSoon() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = resolveAgencyBrowserTitle(window.location.hostname) ?? "Essya Tur — Site em construção";

    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;
    description?.setAttribute(
      "content",
      "A Essya Tur está preparando um novo site. Em breve, novas experiências de viagem estarão disponíveis por aqui.",
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
    <div className="relative min-h-screen overflow-hidden bg-[#f7f5f0]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[440px] w-[440px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #cbb47e 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #1d3d54 0%, transparent 70%)" }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <section className="w-full rounded-[28px] border border-[#e3dccb] bg-white/85 px-7 py-12 text-center shadow-[0_24px_60px_-40px_rgba(20,55,78,0.4)] backdrop-blur-sm sm:px-14 sm:py-16">
          <img
            src={logoAsset.url}
            alt="Essya Tur"
            width={600}
            height={375}
            className="mx-auto h-28 w-auto max-w-[300px] object-contain sm:h-36 sm:max-w-[380px]"
          />

          <div aria-hidden="true" className="mx-auto mt-10 h-px w-16 bg-[#b3924a]" />

          <h1 className="mt-9 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#16374e] sm:text-[34px]">
            Novo site em construção
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[#5b6b77] sm:text-lg">
            A <BrandText>Essya Tur</BrandText> está preparando um novo espaço para planejar as suas
            próximas viagens. Em breve, novidades por aqui.
          </p>

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-[#a08a5a]">
            Em breve
          </p>
        </section>
      </main>
    </div>
  );
}
