import {
  ArrowRight, Bus, Compass, Handshake, MapPinned, MessageCircle, Sparkles, UserRound, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgencyDmcConfig } from "@/lib/agencySiteConfig";
import { isEditorialTheme, siteContainer } from "@/lib/agencySiteTheme";
import destinoEuropa from "@/assets/whitelabel/destino-europa.jpg";

/** Ícones consistentes do projeto para cada serviço B2B. */
const SERVICE_ICONS: Record<string, typeof Bus> = {
  transfers: Bus,
  passeios: Sparkles,
  roteiros: Compass,
  acompanhamento: MapPinned,
  guias: Users,
  concierge: UserRound,
};

/**
 * Faixa editorial B2B (DMC) da home white label. Institucional: o CTA usa o
 * WhatsApp real já resolvido pelo perfil da agência e, na ausência dele, cai no
 * fluxo de atendimento existente do site (Central de Solicitações).
 */
export function AgencyDmcSection({
  config,
  whatsappNumber,
  onFallbackContact,
  hostname,
}: {
  config: AgencyDmcConfig;
  whatsappNumber: string | null;
  onFallbackContact: () => void;
  hostname?: string | null;
}) {
  const href = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(config.whatsappMessage)}`
    : null;
  const editorial = isEditorialTheme(hostname);

  if (editorial) {
    return (
      <section
        id="dmc-agencias"
        aria-labelledby="dmc-agencias-title"
        className="bg-[hsl(var(--wl-navy))] text-background"
      >
        <div className={`${siteContainer(true)} grid items-center gap-12 py-20 md:py-24 lg:grid-cols-[1.05fr_0.95fr]`}>
          <div>
            <p className="inline-flex items-center gap-2 border-b border-background/25 pb-2 text-[11px] font-bold tracking-[0.18em] text-background/85">
              <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
              {config.kicker}
            </p>
            <h2
              id="dmc-agencias-title"
              className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.08] md:text-5xl"
            >
              {config.title}
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-background/75 md:text-base">
              {config.text}
            </p>

            <ul className="mt-9 max-w-xl divide-y divide-background/12 border-y border-background/12">
              {config.services.map((s) => {
                const Icon = SERVICE_ICONS[s.key] ?? Sparkles;
                return (
                  <li key={s.key} className="flex items-center gap-4 py-3.5">
                    <Icon className="h-5 w-5 shrink-0 text-background/70" aria-hidden="true" />
                    <span className="text-[15px] font-medium text-background">{s.label}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              {href ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-lg px-6 text-[15px] font-semibold text-white [&_svg]:text-white"
                >
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    {config.cta}
                  </a>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-12 rounded-lg px-6 text-[15px] font-semibold text-white [&_svg]:text-white"
                  onClick={onFallbackContact}
                >
                  {config.cta} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>

            <p className="mt-5 max-w-xl text-[13px] text-background/60">{config.note}</p>
          </div>

          <div className="relative overflow-hidden rounded-xl">
            <img
              src={destinoEuropa}
              alt=""
              loading="lazy"
              className="h-[420px] w-full object-cover md:h-[520px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--wl-navy)/0.75)] via-transparent to-transparent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="dmc-agencias"
      aria-labelledby="dmc-agencias-title"
      className="border-y border-border/60 bg-foreground/[0.97] text-background"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-background">
            <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
            {config.kicker}
          </p>
          <h2
            id="dmc-agencias-title"
            className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
          >
            {config.title}
          </h2>
          <div className="mt-3 h-1 w-16 rounded-full bg-primary" />
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-background/80 md:text-base">
            {config.text}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {href ? (
              <Button asChild size="lg">
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  {config.cta}
                </a>
              </Button>
            ) : (
              <Button size="lg" onClick={onFallbackContact}>
                {config.cta} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs text-background/60">{config.note}</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {config.services.map((s) => {
            const Icon = SERVICE_ICONS[s.key] ?? Sparkles;
            return (
              <li
                key={s.key}
                className="flex items-center gap-3 rounded-xl border border-background/15 bg-background/[0.06] p-4 transition-colors motion-safe:duration-200 hover:bg-background/[0.12]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-background">{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
