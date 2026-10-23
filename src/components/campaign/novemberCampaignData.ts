import caribe from "@/assets/whitelabel/destinos-com-a-ju/destino-caribe-mexico.jpg.asset.json";
import cancun from "@/assets/whitelabel/100-limites/destino-cancun.jpg.asset.json";
import orlando from "@/assets/orlando/editorial/disney-castle.webp.asset.json";
import europa from "@/assets/whitelabel/destino-europa-neuschwanstein-2.jpg.asset.json";
import cruise from "@/assets/whitelabel/mundo-ncl-destaque.webp.asset.json";
import brasil from "@/assets/resorts-brasil/iberostar-praia-do-forte.webp";

export const campaignImages = { hero: cancun.url, closing: caribe.url };
export const campaignCategories = [
  { id: "praias", label: "Praias e Resorts", image: caribe.url, alt: "Mar turquesa no Caribe" },
  { id: "familia", label: "Família e Orlando", image: orlando.url, alt: "Castelo do Magic Kingdom em Orlando" },
  { id: "europa", label: "Europa", image: europa.url, alt: "Castelo de Neuschwanstein na Europa" },
  { id: "cruzeiros", label: "Cruzeiros", image: cruise.url, alt: "Navio de cruzeiro da NCL" },
  { id: "brasil", label: "Brasil", image: brasil, alt: "Resort à beira-mar no Brasil" },
] as const;
export interface CampaignOffer {
  id: string; category: string; title: string; image: string; alt: string;
  description: string; modality: string; value: string; period: string;
  discountPercent?: number; installments?: number; installmentBRL?: number;
}
/** All entries are illustrative; no supplier, availability or booking integration. */
export const novemberOffers: CampaignOffer[] = [
  { id: "cancun", category: "praias", title: "Cancún All Inclusive", image: cancun.url, alt: "Praia de Cancún e mar azul-turquesa", description: "Mar do Caribe e dias para desacelerar.", modality: "Desconto ilustrativo", value: "até 30%", discountPercent: 30, period: "novembro-2026" },
  { id: "orlando", category: "familia", title: "Orlando em Família", image: orlando.url, alt: "Castelo do Magic Kingdom em Orlando", description: "Parques, descobertas e memórias em família.", modality: "Parcelamento ilustrativo", value: "a partir de 10x R$599", installments: 10, installmentBRL: 599, period: "novembro-2026" },
  { id: "europa", category: "europa", title: "Europa 2027", image: europa.url, alt: "Castelo de Neuschwanstein entre montanhas", description: "Novas paisagens para o seu próximo capítulo.", modality: "Condição especial", value: "condição especial", period: "2027" },
  { id: "cruzeiros", category: "cruzeiros", title: "Cruzeiros 2027", image: cruise.url, alt: "Navio de cruzeiro com proa colorida", description: "Vários destinos. Uma nova forma de viajar.", modality: "Consulta personalizada", value: "sob consulta", period: "2027" },
];
export function filterCampaignOffers(offers: CampaignOffer[], category: string, period = "todos") {
  return offers.filter((offer) => (category === "todos" || offer.category === category) && (period === "todos" || offer.period === period));
}