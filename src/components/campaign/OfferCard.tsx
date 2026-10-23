import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignOffer } from "./novemberCampaignData";
export function OfferCard({ offer, onSelect }: { offer: CampaignOffer; onSelect: (offer: CampaignOffer) => void }) {
  return <article className="campaign-offer">
    <div className="campaign-offer-photo"><img src={offer.image} alt={offer.alt} loading="lazy" /><span className="campaign-offer-tag">{offer.modality}</span></div>
    <div className="campaign-offer-body"><p className="campaign-demo-label">DEMONSTRAÇÃO</p><h3>{offer.title}</h3><p className="campaign-offer-description">{offer.description}</p><div className="campaign-offer-value">{offer.discountPercent ? <><small>até</small><strong>{offer.discountPercent}%</strong></> : offer.installments ? <><small>a partir de {offer.installments}x</small><strong>R${offer.installmentBRL}</strong></> : <strong className="campaign-offer-condition">{offer.value}</strong>}</div><p className="campaign-offer-note">Exemplo de campanha · sem contratação</p><Button onClick={() => onSelect(offer)}>{offer.action} <ArrowUpRight /></Button></div>
  </article>;
}