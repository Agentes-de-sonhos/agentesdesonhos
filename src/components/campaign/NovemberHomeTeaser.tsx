import { useMemo, type ReactNode } from "react";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicOffers } from "@/pages/whitelabel/AgencyOffersPage";
import { offerInChannel } from "@/lib/offers";
import { agencySiteHref } from "@/lib/agencyContextLink";
import emblem from "@/assets/campaign/november-emblem.png.asset.json";
import { campaignCategories, campaignImages, campaignOfferFromPublic } from "./novemberCampaignData";

export const NOVEMBER_PAGE = "/oportunidades-novembro";
const FALLBACK_CATEGORIES = ["praias", "cruzeiros", "familia"] as const;

/**
 * Resumo da página Oportunidades de Novembro na Home da O Mundo em Cores.
 * Mostra até 4 ofertas reais marcadas para "novembro", em uma única linha no
 * desktop; sem ofertas, mostra categorias da campanha (nunca fictícias).
 */
export function NovemberHomeTeaser({ hostname, container, heading }: { hostname: string; container: string; heading: ReactNode }) {
  const { data: publicOffers = [] } = usePublicOffers(hostname);
  const offers = useMemo(
    () => publicOffers.filter((o) => offerInChannel(o, "novembro")).slice(0, 4).map((o) => campaignOfferFromPublic(o, campaignImages.hero)),
    [publicOffers],
  );
  const pageHref = agencySiteHref(`${NOVEMBER_PAGE}#oportunidades`);
  const radarHref = agencySiteHref(`${NOVEMBER_PAGE}#radar`);

  return (
    <section id="ofertas-novembro" className="scroll-mt-24">
      <div className={`${container} py-14 md:py-20`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1 [&>div]:mb-0">{heading}</div>
          <img src={emblem.url} alt="Aproveite ofertas incríveis em novembro" width={1254} height={1254} className="hidden h-auto w-36 shrink-0 self-center md:block lg:w-44" />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {offers.length
            ? offers.map((offer) => (
                <a key={offer.id} href={pageHref} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                  {offer.imageOnly ? (
                    <img src={offer.image} alt={offer.alt} loading="lazy" className="block h-auto w-full" />
                  ) : (
                    <>
                      <img src={offer.image} alt={offer.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-foreground">{offer.title}</h3>
                        {offer.location && <p className="mt-1 text-sm text-muted-foreground">{offer.location}</p>}
                        {offer.priceLabel ? (
                          <p className="mt-3 text-sm text-muted-foreground">A partir de <strong className="text-base text-foreground">{offer.priceLabel}</strong></p>
                        ) : offer.highlight ? <p className="mt-3 text-sm text-muted-foreground">{offer.highlight}</p> : null}
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ver oferta <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                      </div>
                    </>
                  )}
                </a>
              ))
            : FALLBACK_CATEGORIES.map((id) => {
                const cat = campaignCategories.find((c) => c.id === id)!;
                return (
                  <a key={id} href={pageHref} className="group relative block overflow-hidden rounded-2xl">
                    <img src={cat.image} alt={cat.alt} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-lg font-semibold text-background">
                      {cat.label}<ArrowRight aria-hidden="true" />
                    </span>
                  </a>
                );
              })}
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Compass aria-hidden="true" /></span>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                <strong className="block text-base text-foreground">Não encontrou o destino ou a data que procurava?</strong>
                Ative o Radar de Oportunidades e nossa equipe busca condições<br className="hidden md:inline" /> para o seu destino, período e orçamento.
              </p>
            </div>
            <Button asChild className="shrink-0 self-start lg:self-auto"><a href={radarHref}>Ativar Radar de Oportunidades</a></Button>
          </div>
          <Button asChild variant="outline" className="shrink-0 self-start md:self-auto">
            <a href={pageHref}>Ver todas as ofertas <ArrowRight aria-hidden="true" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}
