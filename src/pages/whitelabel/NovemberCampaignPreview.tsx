import { useMemo, useState } from "react";
import { MundoSEO } from "@/components/seo/MundoSEO";
import { BrowserRouter } from "react-router-dom";
import { Headphones, Plane, ShieldCheck, Tag } from "lucide-react";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { MUNDO_EM_CORES_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { AgencyRequestCenter } from "@/components/whitelabel/AgencyRequestCenter";
import { agencySiteHref } from "@/lib/agencyContextLink";
import { isNovemberCampaignAllowed } from "@/lib/novemberCampaignAccess";
import { CampaignHero } from "@/components/campaign/CampaignHero";
import { CategoryRail } from "@/components/campaign/CategoryRail";
import { FeaturedOffers } from "@/components/campaign/FeaturedOffers";
import { OpportunityRadar } from "@/components/campaign/OpportunityRadar";
import { ClosingCTA } from "@/components/campaign/ClosingCTA";
import { campaignOfferFromPublic, filterCampaignOffers, type CampaignOffer } from "@/components/campaign/novemberCampaignData";
import { usePublicOffers } from "@/pages/whitelabel/AgencyOffersPage";
import { offerInChannel } from "@/lib/offers";
import { campaignImages } from "@/components/campaign/novemberCampaignData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlanChoiceDialog, offerWhatsappUrl, MUNDO_WHATSAPP } from "@/components/campaign/PlanChoiceDialog";
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
  const [contact, setContact] = useState(false);
  const [choice, setChoice] = useState<CampaignOffer | null>(null);
  useAgencyFavicon(mundoFavicon.url);
  const { data: publicOffers = [] } = usePublicOffers("omundoemcores.com.br");
  const realOffers = useMemo(() => publicOffers.filter(o => offerInChannel(o, "novembro")).map(o => campaignOfferFromPublic(o, campaignImages.hero)), [publicOffers]);
  const allowed = isNovemberCampaignAllowed(window.location.hostname, window.location.search);
  if (!allowed) return <BrowserRouter><NotFound /></BrowserRouter>;
  const offers = filterCampaignOffers(realOffers, category, period);
  const onSelectOffer = (offer: CampaignOffer) => {
    // Oferta por imagem sem link: WhatsApp direto, já identificando a oferta.
    if (offer.imageOnly && !offer.ctaUrl) { window.open(offerWhatsappUrl(offer), "_blank", "noopener"); return; }
    setChoice(offer);
  };
  const onBuyOnline = (offer: CampaignOffer) => {
    setChoice(null);
    if (offer.imageOnly && offer.ctaUrl) window.open(offer.ctaUrl, "_blank", "noopener");
    else if (offer.real && offer.href) window.location.assign(agencySiteHref(offer.href));
  };
  return <BrowserRouter><div className="november-preview">
    <AgencySiteLayout info={{ ...MUNDO_EM_CORES_PREVIEW_INFO, hostname: "omundoemcores.com.br", agency_name: "O Mundo em Cores", phone: MUNDO_WHATSAPP }}>
      <MundoSEO hostname="omundoemcores.com.br" />
      <div className="november-campaign">
        <CampaignHero /><CategoryRail active={category} onSelect={id => { setCategory(id); setPeriod("todos"); }} />
        <FeaturedOffers real offers={offers} onSelect={onSelectOffer} onReset={() => { setCategory("todos"); setPeriod("todos"); }} />
        <OpportunityRadar hostname="omundoemcores.com.br" />
        <section className="campaign-differentials"><div className="campaign-container campaign-differential-grid">{differentials.map(item => <div className="campaign-differential" key={item.title}><item.icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></section>
        <ClosingCTA onContact={() => setContact(true)} onWhatsapp={() => window.open(`https://wa.me/${MUNDO_WHATSAPP}?text=${encodeURIComponent("Olá! Vi as Oportunidades de Novembro e gostaria de planejar uma viagem com a O Mundo em Cores.")}`, "_blank", "noopener")} />
      </div>
    </AgencySiteLayout>
    <Dialog open={contact} onOpenChange={setContact}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Planejar minha viagem</DialogTitle><DialogDescription>Solicite uma proposta à O Mundo em Cores.</DialogDescription></DialogHeader>{contact && <AgencyRequestCenter hostname="omundoemcores.com.br" agencyName="O Mundo em Cores" initialService="pacotes" variant="plain" hideHeading />}</DialogContent></Dialog>
    <PlanChoiceDialog offer={choice} onClose={() => setChoice(null)} onBuyOnline={onBuyOnline} />
  </div></BrowserRouter>;
}