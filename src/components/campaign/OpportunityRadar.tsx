import { useState } from "react";
import { Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignCategories } from "./novemberCampaignData";
export interface RadarSelection { category: string; period: string; travelers: string; budget: string }
export function OpportunityRadar({ onSearch }: { onSearch: (selection: RadarSelection) => void }) {
  const [selection, setSelection] = useState<RadarSelection>({ category: "todos", period: "todos", travelers: "2", budget: "flexivel" });
  const [searched, setSearched] = useState(false);
  const update = (key: keyof RadarSelection, value: string) => setSelection(previous => ({ ...previous, [key]: value }));
  return <section id="radar" className="campaign-container campaign-radar">
    <div className="campaign-radar-top">
      <div className="campaign-radar-heading"><span className="campaign-radar-icon"><Compass aria-hidden="true" /></span><div><h2>Radar de Oportunidades</h2><p>Pesquise entre as oportunidades disponíveis ou peça ajuda à nossa equipe.</p></div></div>
      <p className="campaign-radar-aside">Não encontrou o que procura? Nossa equipe encontra a melhor opção para você.</p>
    </div>
    <form onSubmit={event => { event.preventDefault(); onSearch(selection); setSearched(true); }} className="campaign-radar-form">
      <label><span>Destino de interesse</span><select aria-label="Destino" value={selection.category} onChange={event => update("category", event.target.value)}><option value="todos">Escolha um destino</option>{campaignCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      <label><span>Quando pretende viajar?</span><select aria-label="Período" value={selection.period} onChange={event => update("period", event.target.value)}><option value="todos">Qual o período?</option><option value="novembro-2026">Novembro 2026</option><option value="2027">2027</option></select></label>
      <label><span>Quantas pessoas?</span><select aria-label="Viajantes" value={selection.travelers} onChange={event => update("travelers", event.target.value)}>{[1, 2, 3, 4, 5].map(number => <option key={number} value={number}>{number === 5 ? "5 ou mais pessoas" : `${number} ${number === 1 ? "pessoa" : "pessoas"}`}</option>)}</select></label>
      <label><span>Qual é o seu orçamento?</span><select aria-label="Orçamento" value={selection.budget} onChange={event => update("budget", event.target.value)}><option value="flexivel">Selecione uma faixa</option><option value="ate-6000">Até R$6.000</option><option value="6000-12000">R$6.000 a R$12.000</option><option value="acima-12000">Acima de R$12.000</option></select></label>
      <Button type="submit" size="lg"><Search />Buscar oportunidades</Button>
    </form>
    <p className="campaign-radar-note" role={searched ? "status" : undefined}>{searched ? "Prévia: destino e período filtram os exemplos acima. Nenhum dado foi enviado ou salvo." : "Busca demonstrativa: nenhum dado será enviado ou salvo."}</p>
  </section>;
}
