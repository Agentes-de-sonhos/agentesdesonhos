import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";

export function CampaignHero() {
  return <section className="campaign-hero" aria-labelledby="campaign-title">
    <img src={campaignImages.hero} alt="Praia panorâmica de Cancún com areia clara e mar tropical" fetchPriority="high" className="campaign-hero-photo" />
    <div className="campaign-hero-veil" />
    <div className="campaign-container campaign-hero-inner">
      <div className="campaign-hero-copy">
        <p className="campaign-eyebrow">O Mundo em Cores · Novembro 2026</p>
        <h1 id="campaign-title">Oportunidades de <span>NOVEMBRO</span></h1>
        <p className="campaign-hero-subtitle">Destinos incríveis, condições especiais e experiências que ficam para sempre.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg"><a href="#oportunidades">Ver oportunidades <ArrowDown /></a></Button>
          <Button asChild size="lg" variant="outline"><a href="#radar">Planejar minha viagem <ArrowUpRight /></a></Button>
        </div>
      </div>
      <div className="campaign-black-friday"><span>BLACK FRIDAY</span><p>viagens incríveis<br />em novembro</p><span className="campaign-badge-line" /></div>
    </div>
  </section>;
}