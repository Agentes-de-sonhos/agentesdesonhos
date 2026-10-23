import { Button } from "@/components/ui/button";
import { campaignCategories } from "./novemberCampaignData";
export function CategoryRail({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return <section className="campaign-container campaign-category-section" aria-label="Categorias de viagem">
    <div className="campaign-section-heading"><div><p className="campaign-eyebrow">Qual é a sua próxima história?</p><h2>Um mundo de possibilidades</h2></div><Button variant="ghost" onClick={() => onSelect("todos")} aria-pressed={active === "todos"}>Ver todas</Button></div>
    <div className="campaign-category-rail">{campaignCategories.map(category => <Button variant="ghost" className="campaign-category" key={category.id} aria-pressed={active === category.id} onClick={() => onSelect(category.id)}>
      <img src={category.image} alt={category.alt} loading="lazy" /><span>{category.label}</span>
    </Button>)}</div>
  </section>;
}