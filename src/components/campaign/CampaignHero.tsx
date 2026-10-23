import { ArrowRight, CreditCard, Plane, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";

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
        <div className="campaign-hero-actions">
          <Button asChild size="lg"><a href="#oportunidades">Ver oportunidades <ArrowRight /></a></Button>
          <Button asChild size="lg" variant="outline"><a href="#radar">Planejar minha viagem <ArrowRight /></a></Button>
        </div>
      </div>
      <div className="campaign-black-friday campaign-aproveite" aria-label="Aproveite: viagens incríveis em novembro"><strong>APROVEITE</strong><span>viagens incríveis<br />em novembro</span></div>
    </div>
  </section>;
}
