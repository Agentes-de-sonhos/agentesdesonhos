import { ArrowRight, CalendarDays, MapPin, Plane, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignOffer } from "./novemberCampaignData";

const featureIcons = [Plane, CalendarDays, Star];

export function OfferCard({ offer, onSelect }: { offer: CampaignOffer; onSelect: (offer: CampaignOffer) => void }) {
  const featured = !!offer.installments;
  return <article className="campaign-offer">
    <div className="campaign-offer-photo"><img src={offer.image} alt={offer.alt} loading="lazy" /><span className={`campaign-offer-tag tone-${offer.tagTone ?? "blue"}`}>{offer.tag ?? offer.modality}</span></div>
    <div className="campaign-offer-body">
      <h3>{offer.title}</h3>
      {offer.location && <p className="campaign-offer-location"><MapPin aria-hidden="true" />{offer.location}</p>}
      <ul className="campaign-offer-features">{offer.features?.map((feature, index) => { const Icon = featureIcons[index % featureIcons.length]; return <li key={feature}><Icon aria-hidden="true" />{feature}</li>; })}</ul>
      <div className="campaign-offer-bottom">
        {offer.real ? (offer.priceLabel ? <div className="campaign-offer-price"><small>A partir de</small><strong>{offer.priceLabel}</strong>{offer.priceNote && <small>{offer.priceNote}</small>}</div> : <p className="campaign-offer-highlight">{offer.highlight}</p>)
          : offer.installments ? <div className="campaign-offer-price"><small>A partir de</small><strong>{offer.installments}x R$ {offer.installmentBRL}</strong><small>Por pessoa + taxas. Valor ilustrativo.</small></div> : <p className="campaign-offer-highlight">{offer.highlight}</p>}
        {!offer.real && <p className="campaign-demo-label">Demonstração · sem contratação</p>}
        <Button className={featured ? "is-featured" : undefined} onClick={() => onSelect(offer)}>{offer.action} <ArrowRight /></Button>
      </div>
    </div>
  </article>;
}
