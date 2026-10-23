import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";
export function ClosingCTA({ onContact }: { onContact: () => void }) {
  return <section className="campaign-closing"><div className="campaign-closing-photo"><img src={campaignImages.closing} alt="Imagem ilustrativa de uma viajante contemplando a costa mediterrânea; não representa Vanessa" width={1280} height={1024} loading="lazy" /></div><div className="campaign-closing-copy"><p className="campaign-eyebrow">Seu próximo destino, do seu jeito</p><h2>Não encontrou a viagem ideal?</h2><p>Vamos pensar na sua próxima viagem juntos? Uma conversa sobre seus desejos, seu ritmo e os detalhes que fazem a diferença.</p><Button size="lg" onClick={onContact}>Planejar com a Vanessa <ArrowUpRight /></Button><small>Atendimento demonstrativo nesta prévia · sem envio</small></div></section>;
}