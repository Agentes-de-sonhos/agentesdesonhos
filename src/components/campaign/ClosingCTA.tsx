import { ArrowRight, CalendarDays, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignImages } from "./novemberCampaignData";

const channels = [
  { icon: MessageCircle, title: "Fale pelo WhatsApp", text: "Atendimento rápido e direto" },
  { icon: CalendarDays, title: "Agende uma conversa", text: "No horário que for melhor para você" },
  { icon: Mail, title: "Receba por e-mail", text: "As melhores opções no seu e-mail" },
];

export function ClosingCTA({ onContact }: { onContact: () => void }) {
  return <section className="campaign-closing">
    <div className="campaign-closing-photo"><img src={campaignImages.closing} alt="Imagem ilustrativa de uma viajante contemplando a costa; não representa Vanessa" width={1280} height={1024} loading="lazy" /></div>
    <div className="campaign-closing-copy"><p className="campaign-kicker">Planejando uma viagem incrível?</p><h2>Não encontrou a viagem ideal?</h2><p>Podemos criar uma proposta personalizada de acordo com seus interesses, período e orçamento.</p><Button size="lg" onClick={onContact}>Solicitar atendimento <ArrowRight /></Button><small>Atendimento demonstrativo nesta prévia · sem envio</small></div>
    <ul className="campaign-closing-channels">{channels.map(item => <li key={item.title}><button type="button" onClick={onContact}><item.icon aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.text}</small></span></button></li>)}</ul>
  </section>;
}
