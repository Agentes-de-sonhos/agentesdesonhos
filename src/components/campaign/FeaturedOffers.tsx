import { CalendarDays, Info, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferCard } from "./OfferCard";
import type { CampaignOffer } from "./novemberCampaignData";
export function FeaturedOffers({ offers, onSelect, onReset }: { offers: CampaignOffer[]; onSelect: (offer: CampaignOffer) => void; onReset: () => void }) {
  return <section id="oportunidades" className="campaign-container campaign-featured">
    <div className="campaign-featured-heading">
      <Star className="campaign-star" aria-hidden="true" />
      <div><h2>Destaques da semana</h2><p>Uma seleção especial de destinos, condições diferenciadas e experiências incríveis para você aproveitar agora.</p></div>
      <span className="campaign-weekly-badge"><CalendarDays aria-hidden="true" />Novas ofertas toda semana</span>
    </div>
    <p className="campaign-disclaimer"><Info aria-hidden="true" /><span>Ofertas e valores meramente ilustrativos nesta prévia. Não disponíveis para contratação.</span></p>
    <div className="campaign-offer-grid">{offers.map(offer => <OfferCard key={offer.id} offer={offer} onSelect={onSelect} />)}</div>
    {!offers.length && <div className="campaign-empty" role="status"><p>Nenhum exemplo para esta combinação.</p><Button variant="outline" onClick={onReset}><RotateCcw />Ver todas as oportunidades</Button></div>}
  </section>;
}
