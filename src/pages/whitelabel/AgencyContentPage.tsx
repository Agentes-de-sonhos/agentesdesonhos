import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { siteContainer } from "@/lib/agencySiteTheme";
import { agencySiteHref } from "@/lib/agencyContextLink";
import type { AgencyContentPage as AgencyContentPageData } from "@/lib/agencySiteContentPages";
import {
  AGENCY_CARD_DESCRIPTION_CLASS,
  AGENCY_CARD_TITLE_CLASS,
  AGENCY_SECTION_SUBTITLE_CLASS,
  AGENCY_SECTION_TITLE_CLASS,
} from "@/lib/agencySiteTypography";
import destinoEuropa from "@/assets/whitelabel/destino-europa.jpg";
import destinoDouro from "@/assets/whitelabel/destino-douro.jpg";
import destinoVilla from "@/assets/whitelabel/destino-villa.jpg";
import destinoGastronomia from "@/assets/whitelabel/destino-gastronomia.jpg";
import destinoBrasil from "@/assets/whitelabel/destino-brasil.jpg";
import destinoGrupos from "@/assets/whitelabel/destino-grupos.jpg";
import destinoLitoral from "@/assets/whitelabel/destino-litoral.jpg";
import destinoResort from "@/assets/whitelabel/destino-resort.jpg";
import destinoCruzeiro from "@/assets/whitelabel/destino-cruzeiro.jpg";
import destinoParques from "@/assets/whitelabel/destino-parques.jpg";
import destinoEuropaCastelo from "@/assets/whitelabel/destino-europa-neuschwanstein-2.jpg.asset.json";

/** Mesmas fotos licenciadas já usadas pelo site; a config fica sem assets. */
const IMAGES: Record<string, string> = {
  europa: destinoEuropa,
  europaCastelo: destinoEuropaCastelo.url,
  douro: destinoDouro,
  villa: destinoVilla,
  gastronomia: destinoGastronomia,
  brasil: destinoBrasil,
  grupos: destinoGrupos,
  litoral: destinoLitoral,
  resort: destinoResort,
  cruzeiro: destinoCruzeiro,
  parques: destinoParques,
};

/**
 * Página institucional interna do site white label, renderizada a partir da
 * configuração declarativa do perfil (`agencySiteContentPages`). Nenhuma
 * consulta ao backend: só conteúdo editorial e links para a home.
 */
export default function AgencyContentPage({ page }: { page: AgencyContentPageData }) {
  const heroUrl = page.heroImage ? IMAGES[page.heroImage] : undefined;
  const requestHref = agencySiteHref("/#solicitacoes");

  return (
    <>
      <SEO title={page.seo.title} description={page.seo.description} />

      <section className="relative overflow-hidden border-b border-border/60 bg-muted/30">
        {heroUrl && (
          <>
            <img
              src={heroUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220_12%_7%/0.82)] via-[hsl(220_12%_7%/0.62)] to-[hsl(220_12%_7%/0.35)]" />
          </>
        )}
        <div className={`relative ${siteContainer(true)} py-16 md:py-24`}>
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.18em] ${heroUrl ? "text-white/80" : "text-muted-foreground"}`}
          >
            {page.kicker}
          </p>
          <h1
            className={`mt-4 max-w-4xl ${AGENCY_SECTION_TITLE_CLASS} ${heroUrl ? "text-white" : ""}`}
          >
            {page.title}
          </h1>
          {page.subtitle && (
            <p
              className={`${AGENCY_SECTION_SUBTITLE_CLASS} max-w-3xl ${heroUrl ? "text-white/85" : ""}`}
            >
              {page.subtitle}
            </p>
          )}
        </div>
      </section>

      {page.intro?.length ? (
        <section className="bg-background">
          <div className={`${siteContainer(true)} py-12 md:py-16`}>
            <div className="max-w-3xl space-y-5">
              {page.intro.map((p, i) => (
                <p key={i} className="text-pretty text-[17px] leading-relaxed text-foreground/80">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {page.cards?.length ? (
        <section className="border-y border-border/60 bg-muted/30">
          <div className={`${siteContainer(true)} py-14 md:py-16`}>
            {page.cardsTitle && (
              <h2 className={`${AGENCY_SECTION_TITLE_CLASS} max-w-3xl`}>{page.cardsTitle}</h2>
            )}
            {page.cardsSubtitle && (
              <p className={`${AGENCY_SECTION_SUBTITLE_CLASS} max-w-3xl`}>{page.cardsSubtitle}</p>
            )}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {page.cards.map((card) => {
                const url = card.image ? IMAGES[card.image] : undefined;
                return (
                  <article
                    key={card.key}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
                  >
                    {url && (
                      <img
                        src={url}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-44 w-full object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className={`${AGENCY_CARD_TITLE_CLASS} text-lg text-foreground`}>
                        {card.title}
                      </h3>
                      {card.meta && (
                        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                          {card.meta}
                        </p>
                      )}
                      <p
                        className={`${AGENCY_CARD_DESCRIPTION_CLASS} mt-3 text-[15px] text-muted-foreground`}
                      >
                        {card.text}
                      </p>
                      {card.bullets?.length ? (
                        <ul className="mt-4 space-y-2">
                          {card.bullets.map((b, i) => (
                            <li key={i} className="flex gap-2 text-[14px] text-foreground/75">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" />
                              <span className="text-pretty">{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {page.blocks?.length ? (
        <section className="bg-background">
          <div className={`${siteContainer(true)} py-14 md:py-16`}>
            <div className="grid gap-10 md:grid-cols-2 md:gap-12">
              {page.blocks.map((block) => (
                <div key={block.key} className="min-w-0">
                  {block.title && (
                    <h2 className="text-pretty text-2xl font-extrabold leading-snug text-foreground">
                      {block.title}
                    </h2>
                  )}
                  {block.paragraphs?.length ? (
                    <div className="mt-4 space-y-4">
                      {block.paragraphs.map((p, i) => (
                        <p key={i} className="text-pretty leading-relaxed text-muted-foreground">
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {block.bullets?.length ? (
                    <ul className="mt-5 space-y-3">
                      {block.bullets.map((b, i) => (
                        <li key={i} className="flex gap-3 text-[15px] text-foreground/80">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/45" />
                          <span className="text-pretty">{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {page.closing && (
        <section className="border-t border-border/60 bg-muted/30">
          <div className={`${siteContainer(true)} py-14 md:py-16`}>
            <div className="max-w-3xl">
              <h2 className="text-pretty text-2xl font-extrabold leading-snug text-foreground md:text-3xl">
                {page.closing.title}
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                {page.closing.text}
              </p>
              <Button asChild size="lg" className="mt-7">
                <a href={requestHref}>{page.closing.cta}</a>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
