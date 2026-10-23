import { ArrowRight, Camera, Palmtree, Ship, Trees, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignCategories } from "./novemberCampaignData";

const icons = { praias: Palmtree, familia: Users, europa: Camera, cruzeiros: Ship, brasil: Trees } as const;

export function CategoryRail({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return <section className="campaign-container campaign-category-section" aria-label="Categorias de viagem">
    <div className="campaign-section-heading"><h2>Que tipo de viagem combina com você?</h2><a href="#oportunidades" className="campaign-link" onClick={() => onSelect("todos")}>Ver todas as oportunidades <ArrowRight aria-hidden="true" /></a></div>
    <div className="campaign-category-rail">{campaignCategories.map(category => {
      const Icon = icons[category.id];
      return <Button variant="ghost" className="campaign-category" key={category.id} aria-pressed={active === category.id} onClick={() => onSelect(category.id)}>
        <img src={category.image} alt={category.alt} loading="lazy" />
        <span className="campaign-category-caption"><span className="campaign-category-label"><Icon aria-hidden="true" />{category.label}</span><span className="campaign-category-arrow"><ArrowRight aria-hidden="true" /></span></span>
      </Button>;
    })}</div>
  </section>;
}
