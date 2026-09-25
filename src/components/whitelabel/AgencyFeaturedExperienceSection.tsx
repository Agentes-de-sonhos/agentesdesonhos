import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyFeaturedExperience } from "@/lib/agencySiteProfile";

/**
 * "Experiência em destaque": seção editorial reutilizável e totalmente
 * configurada pelo perfil da agência. Sem URL configurada, o botão não é
 * renderizado como link (nunca aponta para página inexistente).
 */
export function AgencyFeaturedExperienceSection({
  config,
  container,
}: {
  config: AgencyFeaturedExperience;
  container: string;
}) {
  const reverse = config.align === "right";
  const href = config.ctaHref
    ? config.ctaHref.startsWith("/")
      ? agencySiteHref(config.ctaHref)
      : config.ctaHref
    : null;

  return (
    <section
      id={config.id ?? "experiencia-destaque"}
      aria-labelledby="featured-experience-title"
      className="bg-background py-16 md:py-24"
      data-testid="featured-experience"
    >
      <div className={`${container} grid items-center gap-10 lg:grid-cols-[2fr_3fr] lg:gap-14`}>
        <div className={reverse ? "lg:order-2" : undefined}>
          {config.kicker && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{config.kicker}</p>
          )}
          <h2
            id="featured-experience-title"
            className="mt-3 font-display text-3xl leading-tight text-foreground md:text-4xl"
          >
            {config.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{config.description}</p>
          {config.highlights && config.highlights.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {config.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          {config.ctaLabel && (
            <div className="mt-8">
              {href ? (
                <Button asChild size="lg" className="min-h-11 w-full rounded-full sm:w-auto">
                  <a href={href}>
                    {config.ctaLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </a>
                </Button>
              ) : (
                <Button size="lg" className="min-h-11 w-full rounded-full sm:w-auto" disabled aria-disabled>
                  {config.ctaLabel}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className={`relative ${reverse ? "lg:order-1" : ""} order-first lg:order-none`}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted">
            <img
              src={config.mainImage.src}
              alt={config.mainImage.alt}
              loading="lazy"
              decoding="async"
              width={1920}
              height={754}
              className="h-full w-full origin-left scale-[1.08] object-cover"
              style={{ objectPosition: config.mainImage.position ?? "center" }}
            />
            {config.badge && (
              <img
                src={config.badge.src}
                alt={config.badge.alt}
                loading="lazy"
                className="absolute right-4 top-4 w-36 max-w-[44%] rounded-xl bg-background/95 object-contain p-2 shadow-lg ring-1 ring-border/60 md:right-5 md:top-5 md:w-48"
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 md:mt-0 md:contents">
            {config.consultantImage && (
              <figure className="col-span-3 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-md md:absolute md:-bottom-10 md:left-6 md:w-[46%]">
                <img
                  src={config.consultantImage.src}
                  alt={config.consultantImage.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                  style={{ objectPosition: config.consultantImage.position ?? "center" }}
                />
              </figure>
            )}
            {(config.secondaryImages ?? []).slice(0, 2).map((img, i) => (
              <figure
                key={img.src}
                className={`hidden overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-md md:absolute md:block md:-bottom-10 md:w-[22%] ${
                  i === 0 ? "md:right-[26%]" : "md:right-2"
                }`}
              >
                <img src={img.src} alt={img.alt} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
              </figure>
            ))}
          </div>
          <div className="hidden md:block md:h-10" aria-hidden />
        </div>
      </div>
    </section>
  );
}
