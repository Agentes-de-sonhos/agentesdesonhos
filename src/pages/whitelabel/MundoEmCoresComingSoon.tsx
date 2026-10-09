import { useEffect } from "react";
import { BrandText } from "@/components/ui/brand-text";
import logoAsset from "@/assets/ads-preview/mundo-em-cores-briefing-14-logo.png.asset.json";
import { resolveAgencyBrowserTitle } from "@/hooks/useAgencyBrowserTitle";

/**
 * Página temporária EXCLUSIVA do domínio omundoemcores.com.br (O Mundo em Cores).
 * Estática: não depende de cadastro da agência no banco (o perfil ainda não
 * existe como tenant — a página funciona mesmo quando `get_agency_domain` não
 * resolve). Sem menu, formulário, CTA, login ou links. Quando o site completo
 * entrar no ar, basta trocar a variante em `agencySiteStatus`.
 *
 * Identidade: base branca com detalhes no azul oficial #245C81 (memória da
 * marca). Nenhum contato, data ou promessa inventada.
 */
export default function MundoEmCoresComingSoon() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      resolveAgencyBrowserTitle(window.location.hostname) ?? "O Mundo em Cores — Site em construção";

    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;
    description?.setAttribute(
      "content",
      "A O Mundo em Cores está preparando um novo site. Em breve, um novo espaço para planejar as suas próximas viagens.",
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
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-[0.08]"
        style={{
          background: "radial-gradient(60% 100% at 50% 0%, #245C81 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -left-28 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #245C81 0%, transparent 70%)" }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <section className="w-full rounded-[28px] border border-[#dbe6ee] bg-white/90 px-7 py-12 text-center shadow-[0_24px_60px_-40px_rgba(36,92,129,0.45)] backdrop-blur-sm sm:px-14 sm:py-16">
          <img
            src={logoAsset.url}
            alt="O Mundo em Cores"
            className="mx-auto h-24 w-auto max-w-[320px] object-contain sm:h-32 sm:max-w-[400px]"
          />

          <div aria-hidden="true" className="mx-auto mt-10 h-px w-16 bg-[#245C81]" />

          <h1 className="mt-9 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#245C81] sm:text-[34px]">
            Novo site em construção
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[#5b6b77] sm:text-lg">
            A <BrandText>O Mundo em Cores</BrandText> está preparando um novo espaço para planejar as
            suas próximas viagens. Em breve, novidades por aqui.
          </p>

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-[#245C81]/70">
            Em breve
          </p>
        </section>
      </main>
    </div>
  );
}
