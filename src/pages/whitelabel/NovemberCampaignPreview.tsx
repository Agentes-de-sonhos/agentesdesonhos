import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { Headphones, Plane, ShieldCheck, Tag } from "lucide-react";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { MUNDO_EM_CORES_PREVIEW_INFO, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { isNovemberCampaignAllowed } from "@/lib/novemberCampaignAccess";
import { CampaignHero } from "@/components/campaign/CampaignHero";
import { CategoryRail } from "@/components/campaign/CategoryRail";
import { FeaturedOffers } from "@/components/campaign/FeaturedOffers";
import { OpportunityRadar, type RadarSelection } from "@/components/campaign/OpportunityRadar";
import { ClosingCTA } from "@/components/campaign/ClosingCTA";
import { filterCampaignOffers, novemberOffers, type CampaignOffer } from "@/components/campaign/novemberCampaignData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/NotFound";
import "@/styles/november-campaign.css";
import { useAgencyFavicon } from "@/hooks/useAgencyFavicon";
import mundoFavicon from "@/assets/whitelabel/favicon-o-mundo-em-cores.png.asset.json";

const differentials = [
  { icon: Headphones, title: "Atendimento personalizado", text: "Nossa equipe ajuda você a encontrar a melhor opção." },
  { icon: Tag, title: "Condições exclusivas", text: "Ofertas selecionadas com nossos parceiros." },
  { icon: ShieldCheck, title: "Segurança e confiança", text: "Planejamento cuidadoso com uma agência especialista." },
  { icon: Plane, title: "Suporte em toda a viagem", text: "Do planejamento ao retorno, estamos com você." },
];

export default function NovemberCampaignPreview() {
  const [category, setCategory] = useState("todos");
  const [period, setPeriod] = useState("todos");
  const [selected, setSelected] = useState<CampaignOffer | null>(null);
  const [contact, setContact] = useState(false);
  useAgencyFavicon(mundoFavicon.url);
  const allowed = isNovemberCampaignAllowed(window.location.hostname, window.location.search);
  if (!allowed) return <BrowserRouter><NotFound /></BrowserRouter>;
  const onSearch = (selection: RadarSelection) => { setCategory(selection.category); setPeriod(selection.period); };
  const offers = filterCampaignOffers(novemberOffers, category, period);
  return <BrowserRouter><div className="november-preview" onClickCapture={event => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (anchor && !anchor.getAttribute("href")?.startsWith("#")) { event.preventDefault(); event.stopPropagation(); setContact(true); }
  }}>
    <AgencySiteLayout info={{ ...MUNDO_EM_CORES_PREVIEW_INFO, agency_name: "O Mundo em Cores" }} noWhatsapp navOverride={MUNDO_EM_CORES_PREVIEW_PROFILE.nav}>
      <Helmet><title>Oportunidades de Novembro | O Mundo em Cores</title><meta name="description" content="Oportunidades de novembro da O Mundo em Cores: destinos incríveis, condições especiais e planejamento de viagens." /><meta name="robots" content="noindex,nofollow" /><meta property="og:title" content="Oportunidades de Novembro | O Mundo em Cores" /><meta property="og:description" content="Destinos incríveis, condições especiais e experiências que ficam para sempre." /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /></Helmet>
      <div className="november-campaign">
        <CampaignHero /><CategoryRail active={category} onSelect={id => { setCategory(id); setPeriod("todos"); }} />
        <FeaturedOffers offers={offers} onSelect={setSelected} onReset={() => { setCategory("todos"); setPeriod("todos"); }} />
        <OpportunityRadar onSearch={onSearch} />
        <section className="campaign-differentials"><div className="campaign-container campaign-differential-grid">{differentials.map(item => <div className="campaign-differential" key={item.title}><item.icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></section>
        <ClosingCTA onContact={() => setContact(true)} />
      </div>
    </AgencySiteLayout>
    <Dialog open={!!selected || contact} onOpenChange={open => { if (!open) { setSelected(null); setContact(false); } }}><DialogContent className="november-campaign campaign-dialog"><DialogHeader><DialogTitle>{selected?.title ?? "Planejar minha viagem"}</DialogTitle><DialogDescription>Esta é uma demonstração visual. Nenhuma solicitação foi enviada e não há contratação disponível.</DialogDescription></DialogHeader>{selected && <><p className="campaign-offer-value">{selected.value}</p><p>Ofertas e valores meramente ilustrativos nesta prévia. Não disponíveis para contratação.</p></>}<Button onClick={() => { setSelected(null); setContact(false); }}>Continuar explorando</Button></DialogContent></Dialog>
  </div></BrowserRouter>;
}