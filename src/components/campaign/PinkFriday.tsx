import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import provisionalCover from "@/assets/campaign/november-hero-bungalows.jpg";
import { agencySiteHref } from "@/lib/agencyContextLink";
import { agencyDisplayName, type AgencyDomainInfo } from "@/lib/agencyDomains";
import { CAMPAIGN_CATEGORY_OPTIONS } from "@/lib/imageOffers";
import { PINK_FRIDAY_MAIN_HOST, PINK_FRIDAY_PATH, selectPinkFridayOffers } from "@/lib/pinkFriday";
import { usePublicOffers } from "@/pages/whitelabel/AgencyOffersPage";
import { campaignOfferFromPublic, type CampaignOffer } from "./novemberCampaignData";
import "@/styles/pink-friday.css";

type Props = { hostname: string; preview: boolean };

const description = "Descubra oportunidades de viagem selecionadas pela Destinos com a Ju.";

function usePinkOffers({ hostname, preview }: Props) {
  const query = usePublicOffers(hostname, !preview);
  const offers = useMemo(() =>
    preview ? [] : selectPinkFridayOffers(query.data ?? []).map(o => campaignOfferFromPublic(o, "")),
    [preview, query.data],
  );
  return { offers, loading: !preview && query.isLoading };
}

export function PinkFridayMark() {
  return <span className="pink-friday-mark" aria-label="Pink Friday">
    <span>Pink</span><span>FRIDAY</span>
  </span>;
}

export function PinkFridayCard({ offer, href, onSelect }: {
  offer: CampaignOffer; href?: string; onSelect?: () => void;
}) {
  return <article className={`pink-friday-card${offer.imageOnly ? " pink-friday-card-flyer" : ""}`}>
    {offer.image && <img className="pink-friday-card-image" src={offer.image} alt={offer.imageOnly ? `Lâmina da oferta: ${offer.title}` : ""} loading="lazy" />}
    <div className="pink-friday-card-content">
      <h3>{offer.title}</h3>
      {!offer.imageOnly && <>
        {offer.location && <p><MapPin size={15} aria-hidden="true" />{offer.location}</p>}
        {!!offer.features?.length && <p><CalendarDays size={15} aria-hidden="true" />{offer.features.join(" · ")}</p>}
        {offer.priceLabel && <strong>{offer.priceLabel}</strong>}
        {offer.priceNote && <small>{offer.priceNote}</small>}
        {offer.highlight && <small>{offer.highlight}</small>}
      </>}
      {href
        ? <a className="pink-friday-card-action" href={href}>Ver oferta <ArrowRight size={17} aria-hidden="true" /></a>
        : <button className="pink-friday-card-action" type="button" onClick={onSelect}>Solicitar orçamento <ArrowRight size={17} aria-hidden="true" /></button>}
    </div>
  </article>;
}

export function PinkFridayHome({ hostname, preview }: Props) {
  const { offers } = usePinkOffers({ hostname, preview });
  const pageHref = agencySiteHref(PINK_FRIDAY_PATH);
  const offersHref = agencySiteHref(`${PINK_FRIDAY_PATH}#ofertas-pink-friday`);
  return <section id="pink-friday" className="pink-friday pink-friday-teaser" aria-labelledby="pink-friday-home-title">
    <div className="pink-friday-container">
      <div className="pink-friday-teaser-intro">
        <div>
          <PinkFridayMark />
          <h2 id="pink-friday-home-title">Sua próxima viagem começa aqui</h2>
          <p>{description}</p>
        </div>
        <a className="pink-friday-button" href={pageHref}>Ver campanha <ArrowRight size={18} aria-hidden="true" /></a>
      </div>
      {!!offers.length && <div className="pink-friday-offers pink-friday-home-offers">
        {offers.slice(0, 4).map(offer => <PinkFridayCard key={offer.id} offer={offer} href={offersHref} />)}
      </div>}
    </div>
  </section>;
}

export function PinkFridayPageContent({ info, preview, onRequest }: {
  info: AgencyDomainInfo; preview: boolean; onRequest: (offer?: CampaignOffer) => void;
}) {
  const { offers, loading } = usePinkOffers({ hostname: info.hostname, preview });
  const [category, setCategory] = useState("todos");
  const categories = CAMPAIGN_CATEGORY_OPTIONS.filter(option => offers.some(offer => offer.category === option.id));
  const shown = category === "todos" ? offers : offers.filter(offer => offer.category === category);
  return <div className="pink-friday">
    <section className="pink-friday-hero" aria-labelledby="pink-friday-title">
      <div className="pink-friday-container pink-friday-hero-grid">
        <div className="pink-friday-hero-copy">
          <p className="pink-friday-eyebrow"><Sparkles size={16} aria-hidden="true" />{agencyDisplayName(info)}</p>
          <h1 id="pink-friday-title"><PinkFridayMark /></h1>
          <p className="pink-friday-hero-subtitle">Sua próxima viagem começa aqui</p>
          <p>{description}</p>
          <a className="pink-friday-button" href="#ofertas-pink-friday">Explorar ofertas <ArrowRight size={18} aria-hidden="true" /></a>
        </div>
        <img className="pink-friday-hero-image" src={provisionalCover} alt="Bangalôs sobre o mar" />
      </div>
    </section>
    <section id="ofertas-pink-friday" className="pink-friday-container pink-friday-list" aria-labelledby="pink-friday-list-title">
      <p className="pink-friday-eyebrow"><Sparkles size={16} aria-hidden="true" />Seleção da Ju</p>
      <h2 id="pink-friday-list-title">Ofertas Pink Friday</h2>
      {!!categories.length && <div className="pink-friday-filters" aria-label="Filtrar ofertas por categoria">
        {[{ id: "todos", label: "Todas" }, ...categories].map(option => (
          <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)}>{option.label}</button>
        ))}
      </div>}
      {loading && <p role="status">Carregando ofertas…</p>}
      {!loading && !shown.length && <div className="pink-friday-empty" role="status">
        <p>{preview ? "Prévia de layout. Nenhuma oferta foi cadastrada." : "As ofertas da Pink Friday serão divulgadas aqui."}</p>
      </div>}
      {!!shown.length && <div className="pink-friday-offers">
        {shown.map(offer => <PinkFridayCard key={offer.id} offer={offer} onSelect={() => onRequest(offer)} />)}
      </div>}
      {!!shown.length && <small className="pink-friday-terms">Valores e disponibilidade sujeitos a confirmação pela agência.</small>}
    </section>
    <section className="pink-friday-closing">
      <div className="pink-friday-container pink-friday-teaser-intro">
        <div><h2>Vamos planejar sua viagem?</h2><p>Conte à equipe da Ju o que você está procurando.</p></div>
        <button className="pink-friday-button" type="button" onClick={() => onRequest()}>Solicitar orçamento <ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </section>
  </div>;
}

export const pinkFridayCanonical = `https://${PINK_FRIDAY_MAIN_HOST}${PINK_FRIDAY_PATH}`;
