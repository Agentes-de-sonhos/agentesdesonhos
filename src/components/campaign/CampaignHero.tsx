import { ArrowRight, CreditCard, Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";
import emblem from "@/assets/campaign/november-emblem.png.asset.json";

const highlights = [
  { icon: Plane, text: "Destinos selecionados para novembro" },
  { icon: CreditCard, text: "Condições especiais e parcelamento" },
  { icon: ShieldCheck, text: "Suporte especializado do início ao fim" },
];

export function CampaignHero() {
  return <section className="campaign-hero" aria-labelledby="campaign-title">
    <img src={campaignImages.hero} alt="Bangalôs sobre o mar azul-turquesa em uma lagoa tropical" fetchPriority="high" width={1920} height={832} className="campaign-hero-photo" />
    <div className="campaign-hero-veil" />
    <div className="campaign-container campaign-hero-inner">
      <div className="campaign-hero-copy">
        <p className="campaign-kicker">Edição especial 2026</p>
        <h1 id="campaign-title">Oportunidades de <span>Novembro</span></h1>
        <p className="campaign-hero-subtitle">Destinos incríveis, condições especiais e experiências que ficam para sempre.</p>
        <ul className="campaign-hero-highlights">{highlights.map(item => <li key={item.text}><item.icon aria-hidden="true" /><span>{item.text}</span></li>)}</ul>
      </div>
      <img src={emblem.url} alt="Aproveite ofertas incríveis em novembro" className="campaign-emblem" width={1254} height={1254} />
    </div>
  </section>;
}
