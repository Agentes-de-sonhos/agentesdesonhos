import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferCard, usePublicOffers } from "@/pages/whitelabel/AgencyOffersPage";
import { offerInChannel } from "@/lib/offers";
import { agencyContextHref, agencySiteHref } from "@/lib/agencyContextLink";

export function AgencyOffersHomeSection({ hostname, container }: { hostname: string; container: string }) {
  const { data = [], isLoading, isError } = usePublicOffers(hostname);
  const offers = data.filter((offer) => offerInChannel(offer, "ofertas")).slice(0, 3);
  return (
    <section id="ofertas" className="wl-soft-gradient scroll-mt-24">
      <div className={`${container} py-14 md:py-24`}>
        <p className="wl-kicker text-xs font-semibold uppercase text-primary">OPORTUNIDADES</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-4xl">Ofertas selecionadas</h2>
        <p className="mt-4 text-muted-foreground">Encontre sua próxima viagem entre as oportunidades selecionadas pela nossa equipe.</p>
        {isLoading ? <p className="mt-8 text-muted-foreground">Carregando ofertas…</p> : isError ? (
          <p className="mt-8 text-muted-foreground">Não foi possível carregar as ofertas agora. Tente novamente mais tarde.</p>
        ) : offers.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => <OfferCard key={offer.slug} offer={offer} href={agencyContextHref(`/ofertas/${offer.slug}`)} />)}
          </div>
        ) : <p className="mt-8 text-muted-foreground">Novas ofertas em breve.</p>}
        {offers.length > 0 && <Button asChild size="lg" className="mt-8"><a href={agencySiteHref("/ofertas")}>Ver todas as ofertas <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></a></Button>}
      </div>
    </section>
  );
}