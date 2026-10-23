import { formatOfferPeriod, offerPricing, type PublicOffer } from "@/lib/offers";
import caribe from "@/assets/whitelabel/destinos-com-a-ju/destino-caribe-mexico.jpg.asset.json";
import cancun from "@/assets/whitelabel/100-limites/destino-cancun.jpg.asset.json";
import orlando from "@/assets/orlando/editorial/disney-castle.webp.asset.json";
import cruise from "@/assets/whitelabel/mundo-ncl-destaque.webp.asset.json";
import traveler from "@/assets/campaign/november-traveler.jpg";
import heroBungalows from "@/assets/campaign/november-hero-bungalows.jpg";
import coliseu from "@/assets/campaign/november-coliseu.jpg";
import iguacu from "@/assets/campaign/november-iguacu.jpg";

export const campaignImages = { hero: heroBungalows, closing: traveler };
export const campaignCategories = [
  { id: "praias", label: "Praias e Resorts", image: caribe.url, alt: "Mar turquesa no Caribe" },
  { id: "familia", label: "Família e Orlando", image: orlando.url, alt: "Castelo do Magic Kingdom em Orlando" },
  { id: "europa", label: "Europa", image: coliseu, alt: "Coliseu de Roma ao pôr do sol" },
  { id: "cruzeiros", label: "Cruzeiros", image: cruise.url, alt: "Navio de cruzeiro da NCL" },
  { id: "brasil", label: "Brasil", image: iguacu, alt: "Cataratas do Iguaçu" },
] as const;
export interface CampaignOffer {
  id: string; category: string; title: string; image: string; alt: string;
  description: string; modality: string; value: string; period: string;
  action: string;
  tag?: string; tagTone?: "gold" | "blue" | "bronze"; location?: string; features?: string[]; highlight?: string;
  discountPercent?: number; installments?: number; installmentBRL?: number;
  /** Oferta real da agência (vinda de Ofertas), com link para a página pública. */
  real?: boolean; href?: string; priceLabel?: string; priceNote?: string;
}
/** All entries are illustrative; no supplier, availability or booking integration. */
export const novemberOffers: CampaignOffer[] = [
  { id: "cancun", category: "praias", title: "Cancún All Inclusive", image: cancun.url, alt: "Praia de Cancún e mar azul-turquesa", description: "Mar do Caribe e dias para desacelerar.", modality: "Desconto ilustrativo", value: "até 30%", discountPercent: 30, period: "novembro-2026", action: "Ver detalhes", tag: "ATÉ 30% OFF", tagTone: "gold", location: "Cancún, México", features: ["Aéreo + Resort", "7 noites", "All Inclusive"], highlight: "Condições especiais para produtos selecionados." },
  { id: "orlando", category: "familia", title: "Orlando em Família", image: orlando.url, alt: "Castelo do Magic Kingdom em Orlando", description: "Parques, descobertas e memórias em família.", modality: "Parcelamento ilustrativo", value: "a partir de 10x R$599", installments: 10, installmentBRL: 599, period: "novembro-2026", action: "Quero esta oferta", tag: "A PARTIR DE", tagTone: "blue", location: "Orlando, EUA", features: ["Aéreo + Hotel + Parques", "7 noites", "Saídas de diversas datas"] },
  { id: "europa", category: "europa", title: "Europa 2027", image: coliseu, alt: "Coliseu de Roma ao pôr do sol", description: "Novas paisagens para o seu próximo capítulo.", modality: "Condição especial", value: "condição especial", period: "2027", action: "Conhecer oportunidades", tag: "CONDIÇÃO ESPECIAL", tagTone: "bronze", location: "Diversos destinos", features: ["Circuitos e roteiros selecionados", "Saídas entre abril e outubro", "Experiências exclusivas"], highlight: "Benefícios exclusivos de novembro." },
  { id: "cruzeiros", category: "cruzeiros", title: "Cruzeiros 2027", image: cruise.url, alt: "Navio de cruzeiro com proa colorida", description: "Vários destinos. Uma nova forma de viajar.", modality: "Consulta personalizada", value: "sob consulta", period: "2027", action: "Solicitar cotação", tag: "SOB CONSULTA", tagTone: "blue", location: "Diversos destinos", features: ["Saídas e roteiros selecionados", "Diversas companhias", "Brasil e exterior"], highlight: "Fale com nossa equipe e receba condições especiais." },
];
export function filterCampaignOffers(offers: CampaignOffer[], category: string, period = "todos") {
  return offers.filter((offer) => (category === "todos" || offer.category === category || offer.category === "todos") && (period === "todos" || offer.period === period));
}
const CATEGORY_MAP: Record<string, string> = { Cruzeiros: "cruzeiros", Resorts: "praias", Ingressos: "familia" };
/** Converte ofertas reais (marcadas para Oportunidades de Novembro) para o card da campanha. */
export function campaignOfferFromPublic(o: PublicOffer, fallbackImage: string): CampaignOffer {
  const p = offerPricing(o);
  const features = [
    o.nights ? `${o.nights} noites` : null,
    formatOfferPeriod(o.travel_start, o.travel_end),
    ...(o.included_services ?? []).slice(0, 1).map((s) => s.name || s.type),
  ].filter(Boolean) as string[];
  return {
    id: o.slug, real: true, href: `/ofertas/${o.slug}`,
    category: CATEGORY_MAP[o.category ?? ""] ?? "todos", period: "todos",
    title: o.title ?? "Oferta", image: o.cover_url || fallbackImage, alt: o.title ?? "Oferta",
    description: o.description ?? "", modality: o.category ?? "Oferta", value: p.totalLabel,
    action: "Ver detalhes", tag: (o.category ?? "OFERTA").toUpperCase(), tagTone: "gold",
    location: o.destination ?? undefined, features,
    priceLabel: p.mode === "on_request" ? undefined : (p.perPersonLabel ?? p.totalLabel),
    priceNote: p.installmentsLabel ?? p.totalNote ?? undefined,
    highlight: p.mode === "on_request" ? "Valor sob consulta. Fale com nossa equipe." : undefined,
  };
}
