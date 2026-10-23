import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignOffer } from "./novemberCampaignData";
export function OfferCard({ offer, onSelect }: { offer: CampaignOffer; onSelect: (offer: CampaignOffer) => void }) {
  return <article className="campaign-offer">
    <div className="campaign-offer-photo"><img src={offer.image} alt={offer.alt} loading="lazy" /><span className="campaign-offer-tag">{offer.modality}</span></div>
    <div className="campaign-offer-body"><p className="campaign-demo-label">DEMONSTRAÇÃO</p><h3>{offer.title}</h3><p className="campaign-offer-description">{offer.description}</p><div className="campaign-offer-value">{offer.value}</div><p className="campaign-offer-note">Exemplo de campanha · sem contratação</p><Button variant="outline" onClick={() => onSelect(offer)}>Ver oportunidade <ArrowUpRight /></Button></div>
  </article>;
}