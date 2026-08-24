import { useEffect } from "react";
import { BrandText } from "@/components/ui/brand-text";
import logoAsset from "@/assets/whitelabel/logo-destinos-com-a-ju.png.asset.json";

/**
 * Página temporária EXCLUSIVA do domínio destinoscomaju.com.br.
 * Sem menu, formulário, CTA, login ou links — apenas mensagem institucional.
 * Estrutura isolada: basta trocar a variante em `agencySiteStatus` quando o
 * site completo entrar no ar.
 */
export default function DestinosComAJuComingSoon() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Destinos com a Ju — Em breve";

    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;
    description?.setAttribute(
      "content",
      "Em breve, a Destinos com a Ju terá um novo espaço para inspirar e planejar viagens inesquecíveis.",
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
    <div className="relative min-h-screen overflow-hidden bg-[#fdf7f9]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #f7d9e6 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, #f2c6da 0%, transparent 70%)" }}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <section className="w-full rounded-[28px] border border-[#f0d7e3] bg-white/85 px-7 py-12 text-center shadow-[0_24px_60px_-40px_rgba(155,45,95,0.35)] backdrop-blur-sm sm:px-14 sm:py-16">
          <img
            src={logoAsset.url}
            alt="Destinos com a Ju"
            width={480}
            height={252}
            className="mx-auto h-24 w-auto max-w-[280px] object-contain sm:h-32 sm:max-w-[360px]"
          />

          <div
            aria-hidden="true"
            className="mx-auto mt-10 h-px w-16 bg-[#e2aec6]"
          />

          <h1 className="mt-9 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#5c2340] sm:text-[34px]">
            Estamos preparando algo especial para você
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[#7c5768] sm:text-lg">
            Em breve, a <BrandText>Destinos com a Ju</BrandText> terá um novo espaço para inspirar e
            planejar viagens inesquecíveis.
          </p>
        </section>

        <p className="mt-10 text-xs font-medium uppercase tracking-[0.22em] text-[#a98096]">
          <BrandText>Destinos com a Ju</BrandText>
        </p>
      </main>
    </div>
  );
}
