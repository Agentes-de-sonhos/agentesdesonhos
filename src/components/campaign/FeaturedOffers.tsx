import { Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferCard } from "./OfferCard";
import type { CampaignOffer } from "./novemberCampaignData";
export function FeaturedOffers({ offers, onSelect, onReset }: { offers: CampaignOffer[]; onSelect: (offer: CampaignOffer) => void; onReset: () => void }) {
  return <section id="oportunidades" className="campaign-featured">
    <div className="campaign-container"><div className="campaign-section-heading"><div><p className="campaign-eyebrow">Seleção da semana</p><h2>Inspire sua próxima viagem</h2></div><span className="campaign-month">NOVEMBRO / 2026</span></div>
      <p className="campaign-disclaimer"><Info aria-hidden="true" /><span>Ofertas e valores meramente ilustrativos nesta prévia. Não disponíveis para contratação.</span></p>
      <div className="campaign-offer-grid">{offers.map(offer => <OfferCard key={offer.id} offer={offer} onSelect={onSelect} />)}</div>
      {!offers.length && <div className="campaign-empty" role="status"><p>Nenhum exemplo para esta combinação.</p><Button variant="outline" onClick={onReset}><RotateCcw />Ver todas as oportunidades</Button></div>}
    </div>
  </section>;
}