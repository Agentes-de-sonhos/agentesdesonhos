import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";
export function ClosingCTA({ onContact }: { onContact: () => void }) {
  return <section className="campaign-closing"><img src={campaignImages.closing} alt="Vista aérea do mar do Caribe e sua costa" loading="lazy" /><div className="campaign-closing-veil" /><div className="campaign-container campaign-closing-copy"><p className="campaign-eyebrow">Seu próximo destino, do seu jeito</p><h2>Não encontrou a viagem ideal?</h2><p>Cada viagem tem uma história. A sua pode começar com uma nova ideia.</p><Button size="lg" onClick={onContact}>Planejar com a Vanessa <ArrowUpRight /></Button><small>Atendimento demonstrativo nesta prévia · sem envio</small></div></section>;
}